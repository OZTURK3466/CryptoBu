// backend/server.js - Version modifiée avec gestion du rate limit

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

// Stockage des prix en cache AMÉLIORÉ
let priceCache = new Map();
let historicalCache = new Map();
let clients = new Set();
let lastPriceUpdate = 0;
let lastApiCall = 0;
const MIN_DELAY_BETWEEN_CALLS = 60000; // 1 minute entre les appels
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes de cache

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

// Fonction de délai
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Récupération des prix crypto avec gestion du rate limit
async function fetchCryptoPrices() {
  try {
    const now = Date.now();
    
    // Vérifier si on peut faire un appel API
    if (now - lastApiCall < MIN_DELAY_BETWEEN_CALLS) {
      console.log(`⏳ Attente du rate limit... (${Math.ceil((MIN_DELAY_BETWEEN_CALLS - (now - lastApiCall)) / 1000)}s)`);
      return Object.fromEntries(priceCache); // Retourner le cache
    }

    console.log('🔄 Récupération des prix depuis CoinGecko...');
    
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: 'bitcoin,ethereum,cardano,polkadot,chainlink,litecoin,bitcoin-cash,stellar,dogecoin,polygon',
        vs_currencies: 'usd,eur',
        include_24hr_change: 'true',
        include_last_updated_at: 'true'
      },
      timeout: 15000
    });
    
    const prices = response.data;
    lastApiCall = now;
    lastPriceUpdate = now;
    
    // Mettre à jour le cache
    Object.keys(prices).forEach(coin => {
      priceCache.set(coin, prices[coin]);
    });
    
    // Diffuser aux clients WebSocket
    broadcastPrices(prices);
    
    console.log('✅ Prix mis à jour:', new Date().toLocaleTimeString());
    return prices;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des prix:', error.message);
    
    if (error.response?.status === 429) {
      console.log('🚫 Rate limit atteint - utilisation du cache');
      lastApiCall = Date.now(); // Marquer comme si on avait fait un appel
      return Object.fromEntries(priceCache);
    }
    
    return null;
  }
}

// Récupération des données historiques avec cache amélioré
async function fetchHistoricalData(coinId, days = 7) {
  try {
    const cacheKey = `${coinId}-${days}`;
    const now = Date.now();
    
    // Vérifier le cache
    if (historicalCache.has(cacheKey)) {
      const cached = historicalCache.get(cacheKey);
      if (now - cached.timestamp < CACHE_DURATION) {
        console.log(`📊 Utilisation du cache pour ${coinId} (${days} jours)`);
        return cached.data;
      }
    }

    // Vérifier le rate limit
    if (now - lastApiCall < 10000) { // 10 secondes minimum entre les appels
      await delay(10000 - (now - lastApiCall));
    }

    console.log(`🔍 Appel CoinGecko API: ${coinId}, ${days} jours`);
    
    const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`, {
      params: {
        vs_currency: 'usd',
        days: days,
        interval: days <= 1 ? 'hourly' : 'daily'
      },
      timeout: 15000
    });
    
    lastApiCall = now;
    
    if (response.data && response.data.prices) {
      const data = {
        prices: response.data.prices,
        volumes: response.data.total_volumes || [],
        market_caps: response.data.market_caps || []
      };
      
      // Mettre en cache
      historicalCache.set(cacheKey, {
        data: data,
        timestamp: now
      });
      
      console.log(`✅ CoinGecko API réponse: ${response.data.prices.length} points`);
      return data;
    } else {
      console.log(`❌ Réponse CoinGecko invalide pour ${coinId}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Erreur CoinGecko API pour ${coinId}:`, error.message);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}, Data:`, error.response.data);
      
      // Si rate limit, essayer de retourner des données du cache ou des données simulées
      if (error.response.status === 429) {
        console.log(`🚫 Rate limit - tentative de récupération de données alternatives pour ${coinId}`);
        return getFallbackData(coinId, days);
      }
    }
    
    return null;
  }
}

// Fonction pour générer des données de fallback en cas de rate limit
function getFallbackData(coinId, days) {
  console.log(`📊 Génération de données de fallback pour ${coinId}`);
  
  // Prix de base simulés (vous pouvez les ajuster)
  const basePrices = {
    bitcoin: 43000,
    ethereum: 2500,
    cardano: 0.38,
    polkadot: 7.5,
    chainlink: 15.2,
    litecoin: 72,
    'bitcoin-cash': 235,
    stellar: 0.12,
    dogecoin: 0.08,
    polygon: 0.85
  };
  
  const basePrice = basePrices[coinId] || 100;
  const now = Date.now();
  const interval = days <= 1 ? 3600000 : 86400000; // 1h ou 24h
  const points = days <= 1 ? 24 : days;
  
  const prices = [];
  const volumes = [];
  
  for (let i = points - 1; i >= 0; i--) {
    const timestamp = now - (i * interval);
    
    // Variation aléatoire de ±5%
    const variation = (Math.random() - 0.5) * 0.1;
    const price = basePrice * (1 + variation);
    const volume = Math.random() * 1000000000; // Volume aléatoire
    
    prices.push([timestamp, price]);
    volumes.push([timestamp, volume]);
  }
  
  return {
    prices: prices,
    volumes: volumes,
    market_caps: prices.map(([time, price]) => [time, price * 19000000]) // Market cap simulé
  };
}

// Routes API publiques

// Route pour obtenir les prix actuels
app.get('/api/prices', async (req, res) => {
  try {
    let prices = await fetchCryptoPrices();
    
    if (!prices || Object.keys(prices).length === 0) {
      // Si pas de prix, utiliser le cache ou des données par défaut
      if (priceCache.size > 0) {
        prices = Object.fromEntries(priceCache);
      } else {
        // Données par défaut en cas d'échec total
        prices = {
          bitcoin: { usd: 43000, eur: 39000, usd_24h_change: 2.5 },
          ethereum: { usd: 2500, eur: 2300, usd_24h_change: 1.8 },
          cardano: { usd: 0.38, eur: 0.35, usd_24h_change: -0.5 }
        };
      }
    }
    
    res.json(prices);
  } catch (error) {
    console.error('❌ Erreur route /api/prices:', error);
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
    
    let data = await fetchHistoricalData(coinId, numDays);
    
    // Si pas de données de l'API, utiliser les données de fallback
    if (!data || !data.prices || data.prices.length === 0) {
      console.log(`⚠️ Utilisation de données de fallback pour ${coinId}`);
      data = getFallbackData(coinId, numDays);
    }
    
    if (data && data.prices && data.prices.length > 0) {
      console.log(`✅ ${data.prices.length} points de données renvoyés pour ${coinId}`);
      res.json(data);
    } else {
      console.log(`❌ Aucune donnée disponible pour ${coinId}`);
      res.status(404).json({ 
        error: 'Aucune donnée historique disponible',
        coinId: coinId,
        days: numDays,
        suggestion: 'API en limite de taux, réessayez dans quelques minutes'
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
// [Le reste du code reste identique...]

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
    price_cache_size: priceCache.size,
    cache_info: {
      price_cache_entries: priceCache.size,
      historical_cache_entries: historicalCache.size,
      last_api_call: new Date(lastApiCall).toISOString(),
      last_price_update: new Date(lastPriceUpdate).toISOString()
    }
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

// Démarrage des services avec intervalle plus long
setInterval(fetchCryptoPrices, 300000); // 5 minutes au lieu de 2
fetchCryptoPrices(); // Premier fetch

app.listen(PORT, () => {
  console.log(`🚀 Serveur backend démarré sur le port ${PORT}`);
  console.log(`📊 API disponible sur http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket server démarré sur le port 8080`);
  console.log(`⏰ Délai entre appels API: ${MIN_DELAY_BETWEEN_CALLS/1000}s`);
  
  // Test de connexion à la base de données
  pool.query('SELECT NOW()', (err, result) => {
    if (err) {
      console.error('❌ Erreur de connexion à la base de données:', err.message);
    } else {
      console.log('✅ Connexion à la base de données réussie');
    }
  });
});