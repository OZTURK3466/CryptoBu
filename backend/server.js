const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Pool } = require('pg');
const WebSocket = require('ws');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuration PostgreSQL
const pool = new Pool({
  user: 'crypto_user',
  host: 'localhost',
  database: 'crypto_trading',
  password: 'crypto_password',
  port: 5432,
});

// Middleware
app.use(cors());
app.use(express.json());

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
  ws.send(JSON.stringify({
    type: 'price_update',
    data: Object.fromEntries(priceCache)
  }));
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client déconnecté du WebSocket');
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
      client.send(message);
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
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`, {
      params: {
        vs_currency: 'usd',
        days: days,
        interval: days <= 1 ? 'hourly' : 'daily'
      }
    });
    
    return {
      prices: response.data.prices,
      volumes: response.data.total_volumes,
      market_caps: response.data.market_caps
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des données historiques:', error.message);
    return null;
  }
}

// Routes API

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
    
    const data = await fetchHistoricalData(coinId, parseInt(days));
    if (data) {
      res.json(data);
    } else {
      res.status(500).json({ error: 'Impossible de récupérer les données historiques' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Routes pour la simulation de trading

// Créer un utilisateur
app.post('/api/users', async (req, res) => {
  try {
    const { username, email } = req.body;
    const result = await pool.query(
      'INSERT INTO users (username, email, balance) VALUES ($1, $2, $3) RETURNING *',
      [username, email, 10000] // Balance initiale de 10000 USD
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtenir les informations d'un utilisateur
app.get('/api/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtenir le portefeuille d'un utilisateur
app.get('/api/users/:userId/portfolio', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(`
      SELECT p.*, u.balance 
      FROM portfolio p 
      LEFT JOIN users u ON p.user_id = u.id 
      WHERE p.user_id = $1
    `, [userId]);
    
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
    
    res.json({
      holdings: portfolio,
      total_crypto_value: totalValue,
      cash_balance: portfolio.length > 0 ? portfolio[0].balance : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Acheter de la crypto
app.post('/api/users/:userId/buy', async (req, res) => {
  try {
    const { userId } = req.params;
    const { crypto_id, amount_usd } = req.body;
    
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
    res.status(500).json({ error: error.message });
  }
});

// Vendre de la crypto
app.post('/api/users/:userId/sell', async (req, res) => {
  try {
    const { userId } = req.params;
    const { crypto_id, quantity } = req.body;
    
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
      if (newQuantity > 0.00001) { // Garder une petite marge pour les erreurs de floating point
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
    res.status(500).json({ error: error.message });
  }
});

// Obtenir l'historique des transactions
app.get('/api/users/:userId/transactions', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mettre à jour les prix toutes les 30 secondes
setInterval(fetchCryptoPrices, 120000);

// Récupérer les prix au démarrage
fetchCryptoPrices();

app.listen(PORT, () => {
  console.log(`Serveur backend démarré sur le port ${PORT}`);
  console.log(`WebSocket server démarré sur le port 8080`);
});