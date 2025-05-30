const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');
const WebSocket = require('ws');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const { authenticateToken, optionalAuth } = require('./middleware/auth');
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 3001;

// Configuration PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'crypto_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'crypto_trading',
  password: process.env.DB_PASSWORD || 'crypto_password',
  port: process.env.DB_PORT || 5432,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Routes d'authentification
app.use('/api/auth', authRoutes);

const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// WebSocket server pour les prix en temps réel
const wss = new WebSocket.Server({ port: 8080 });

// Stockage des prix en cache
let priceCache = new Map();
let clients = new Set();

// Gestion des connexions WebSocket
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connecté au WebSocket');
  
  // Envoyer les prix actuels au nouveau client
  if (priceCache.size > 0) {
    ws.send(JSON.stringify({
      type: 'price_update',
      data: Object.fromEntries(priceCache)
    }));
  }
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client déconnecté du WebSocket');
  });
  
  ws.on('error', (error) => {
    console.error('Erreur WebSocket:', error);
    clients.delete(ws);
  });
});

// Fonction pour diffuser les prix à tous les clients
function broadcastPrices(prices) {
  const message = JSON.stringify({
    type: 'price_update',
    data: prices,
    timestamp: new Date().toISOString()
  });
  
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        console.error('Erreur envoi WebSocket:', error);
        clients.delete(client);
      }
    }
  });
}

// Récupération des prix crypto depuis CoinGecko
async function fetchCryptoPrices() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: 'bitcoin,ethereum,cardano,polkadot,chainlink,litecoin,bitcoin-cash,stellar,dogecoin,polygon',
        vs_currencies: 'usd,eur',
        include_24hr_change: 'true',
        include_last_updated_at: 'true'
      }
    });
    
    const prices = response.data;
    
    // Mettre à jour le cache
    Object.keys(prices).forEach(coin => {
      priceCache.set(coin, prices[coin]);
    });
    
    // Diffuser aux clients WebSocket
    broadcastPrices(prices);
    
    return prices;
  } catch (error) {
    console.error('Erreur lors de la récupération des prix:', error.message);
    return null;
  }
}

// Récupération des données historiques
async function fetchHistoricalData(coinId, days = 7) {
  try {
    console.log(`🔍 Appel CoinGecko API: ${coinId}, ${days} jours`);
    
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`, {
      params: {
        vs_currency: 'usd',
        days: days,
        interval: days <= 1 ? 'hourly' : 'daily'
      },
      timeout: 10000 // Timeout de 10 secondes
    });
    
    if (response.data && response.data.prices) {
      console.log(`✅ CoinGecko API réponse: ${response.data.prices.length} points`);
      return {
        prices: response.data.prices,
        volumes: response.data.total_volumes || [],
        market_caps: response.data.market_caps || []
      };
    } else {
      console.log(`❌ Réponse CoinGecko invalide pour ${coinId}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Erreur CoinGecko API pour ${coinId}:`, error.message);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}, Data:`, error.response.data);
    }
    
    return null;
  }
}


// Routes API publiques

// Route pour obtenir les prix actuels
app.get('/api/prices', async (req, res) => {
  try {
    const prices = await fetchCryptoPrices();
    if (prices) {
      res.json(prices);
    } else {
      res.status(500).json({ error: 'Impossible de récupérer les prix' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour obtenir les données historiques
app.get('/api/history/:coinId', async (req, res) => {
  try {
    const { coinId } = req.params;
    const { days = 7 } = req.query;
    
    console.log(`📊 Récupération historique: ${coinId}, ${days} jours`);
    
    // Validation des paramètres
    if (!coinId) {
      return res.status(400).json({ error: 'ID de crypto manquant' });
    }
    
    const numDays = parseInt(days);
    if (isNaN(numDays) || numDays < 1 || numDays > 365) {
      return res.status(400).json({ error: 'Nombre de jours invalide (1-365)' });
    }
    
    const data = await fetchHistoricalData(coinId, numDays);
    
    if (data && data.prices && data.prices.length > 0) {
      console.log(`✅ ${data.prices.length} points de données récupérés pour ${coinId}`);
      res.json(data);
    } else {
      console.log(`❌ Aucune donnée pour ${coinId}`);
      res.status(404).json({ 
        error: 'Aucune donnée historique trouvée',
        coinId: coinId,
        days: numDays
      });
    }
  } catch (error) {
    console.error('❌ Erreur historique:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des données historiques',
      details: error.message,
      coinId: req.params.coinId
    });
  }
});

// Routes protégées par authentification

// Obtenir le portefeuille de l'utilisateur connecté
app.get('/api/portfolio', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.balance 
      FROM portfolio p 
      LEFT JOIN users u ON p.user_id = u.id 
      WHERE p.user_id = $1
    `, [req.user.id]);
    
    // Calculer la valeur actuelle du portefeuille
    const portfolio = result.rows;
    let totalValue = 0;
    
    for (const holding of portfolio) {
      const currentPrice = priceCache.get(holding.crypto_id);
      if (currentPrice) {
        holding.current_price = currentPrice.usd;
        holding.current_value = holding.quantity * currentPrice.usd;
        holding.profit_loss = holding.current_value - (holding.quantity * holding.avg_buy_price);
        totalValue += holding.current_value;
      }
    }
    
    // Récupérer le solde cash
    const userResult = await pool.query('SELECT balance FROM users WHERE id = $1', [req.user.id]);
    const cashBalance = userResult.rows.length > 0 ? parseFloat(userResult.rows[0].balance) : 0;
    
    res.json({
      holdings: portfolio,
      total_crypto_value: totalValue,
      cash_balance: cashBalance
    });
  } catch (error) {
    console.error('Erreur portfolio:', error);
    res.status(500).json({ error: error.message });
  }
});

// Acheter de la crypto
app.post('/api/buy', authenticateToken, async (req, res) => {
  try {
    const { crypto_id, amount_usd } = req.body;
    const userId = req.user.id;
    
    console.log(`Achat: ${crypto_id}, ${amount_usd} USD, User: ${userId}`);
    
    // Vérifier le solde de l'utilisateur
    const userResult = await pool.query('SELECT balance FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    const currentBalance = parseFloat(userResult.rows[0].balance);
    if (currentBalance < amount_usd) {
      return res.status(400).json({ error: 'Solde insuffisant' });
    }
    
    // Obtenir le prix actuel
    const currentPrice = priceCache.get(crypto_id);
    if (!currentPrice) {
      return res.status(400).json({ error: 'Prix non disponible pour cette crypto' });
    }
    
    const quantity = amount_usd / currentPrice.usd;
    
    // Commencer une transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Mettre à jour le solde
      await client.query(
        'UPDATE users SET balance = balance - $1 WHERE id = $2',
        [amount_usd, userId]
      );
      
      // Vérifier si l'utilisateur possède déjà cette crypto
      const existingResult = await client.query(
        'SELECT * FROM portfolio WHERE user_id = $1 AND crypto_id = $2',
        [userId, crypto_id]
      );
      
      if (existingResult.rows.length > 0) {
        // Mettre à jour la position existante
        const existing = existingResult.rows[0];
        const newQuantity = parseFloat(existing.quantity) + quantity;
        const newAvgPrice = (parseFloat(existing.quantity) * parseFloat(existing.avg_buy_price) + amount_usd) / newQuantity;
        
        await client.query(
          'UPDATE portfolio SET quantity = $1, avg_buy_price = $2 WHERE user_id = $3 AND crypto_id = $4',
          [newQuantity, newAvgPrice, userId, crypto_id]
        );
      } else {
        // Créer une nouvelle position
        await client.query(
          'INSERT INTO portfolio (user_id, crypto_id, quantity, avg_buy_price) VALUES ($1, $2, $3, $4)',
          [userId, crypto_id, quantity, currentPrice.usd]
        );
      }
      
      // Enregistrer la transaction
      await client.query(
        'INSERT INTO transactions (user_id, crypto_id, type, quantity, price, total_amount) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, crypto_id, 'buy', quantity, currentPrice.usd, amount_usd]
      );
      
      await client.query('COMMIT');
      res.json({ success: true, quantity, price: currentPrice.usd });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erreur achat:', error);
    res.status(500).json({ error: error.message });
  }
});

// Vendre de la crypto
app.post('/api/sell', authenticateToken, async (req, res) => {
  try {
    const { crypto_id, quantity } = req.body;
    const userId = req.user.id;
    
    console.log(`Vente: ${crypto_id}, ${quantity}, User: ${userId}`);
    
    // Vérifier la position de l'utilisateur
    const portfolioResult = await pool.query(
      'SELECT * FROM portfolio WHERE user_id = $1 AND crypto_id = $2',
      [userId, crypto_id]
    );
    
    if (portfolioResult.rows.length === 0) {
      return res.status(400).json({ error: 'Vous ne possédez pas cette crypto' });
    }
    
    const holding = portfolioResult.rows[0];
    if (parseFloat(holding.quantity) < quantity) {
      return res.status(400).json({ error: 'Quantité insuffisante' });
    }
    
    // Obtenir le prix actuel
    const currentPrice = priceCache.get(crypto_id);
    if (!currentPrice) {
      return res.status(400).json({ error: 'Prix non disponible pour cette crypto' });
    }
    
    const saleAmount = quantity * currentPrice.usd;
    
    // Commencer une transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Mettre à jour le solde
      await client.query(
        'UPDATE users SET balance = balance + $1 WHERE id = $2',
        [saleAmount, userId]
      );
      
      // Mettre à jour ou supprimer la position
      const newQuantity = parseFloat(holding.quantity) - quantity;
      if (newQuantity > 0.00001) {
        await client.query(
          'UPDATE portfolio SET quantity = $1 WHERE user_id = $2 AND crypto_id = $3',
          [newQuantity, userId, crypto_id]
        );
      } else {
        await client.query(
          'DELETE FROM portfolio WHERE user_id = $1 AND crypto_id = $2',
          [userId, crypto_id]
        );
      }
      
      // Enregistrer la transaction
      await client.query(
        'INSERT INTO transactions (user_id, crypto_id, type, quantity, price, total_amount) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, crypto_id, 'sell', quantity, currentPrice.usd, saleAmount]
      );
      
      await client.query('COMMIT');
      res.json({ success: true, amount: saleAmount, price: currentPrice.usd });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erreur vente:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    websocket_connections: clients.size,
    price_cache_size: priceCache.size
  });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({ error: 'Erreur serveur interne' });
});

// Route 404
app.use('*', (req, res) => {
  console.log('Route non trouvée:', req.method, req.originalUrl);
  res.status(404).json({ 
    error: 'Endpoint non trouvé',
    path: req.originalUrl,
    method: req.method
  });
});

// Démarrage des services
setInterval(fetchCryptoPrices, 120000); // 2 minutes
fetchCryptoPrices(); // Premier fetch

app.listen(PORT, () => {
  console.log(`🚀 Serveur backend démarré sur le port ${PORT}`);
  console.log(`📊 API disponible sur http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket server démarré sur le port 8080`);
  
  // Test de connexion à la base de données
  pool.query('SELECT NOW()', (err, result) => {
    if (err) {
      console.error('❌ Erreur de connexion à la base de données:', err.message);
    } else {
      console.log('✅ Connexion à la base de données réussie');
    }
  });
});