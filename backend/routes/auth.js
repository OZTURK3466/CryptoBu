const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');
const Joi = require('joi');

const router = express.Router();

const pool = new Pool({
  user: process.env.DB_USER || 'crypto_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'crypto_trading',
  password: process.env.DB_PASSWORD || 'crypto_password',
  port: process.env.DB_PORT || 5432,
});

// Schémas de validation
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Fonction pour générer un token JWT
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Route d'inscription
router.post('/register', async (req, res) => {
  try {
    // Validation des données
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { username, email, password } = value;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Cet email ou nom d\'utilisateur est déjà utilisé' });
    }

    // Hasher le mot de passe
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Créer l'utilisateur
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, balance) VALUES ($1, $2, $3, $4) RETURNING id, username, email, balance',
      [username, email, hashedPassword, 10000.00] // Balance initiale de 10000$
    );

    const newUser = result.rows[0];

    // Générer le token
    const token = generateToken(newUser.id);

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        balance: newUser.balance
      },
      token
    });

  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ error: 'Erreur serveur lors de l\'inscription' });
  }
});

// Route de connexion
router.post('/login', async (req, res) => {
  try {
    // Validation des données
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = value;

    // Récupérer l'utilisateur
    const userResult = await pool.query(
      'SELECT id, username, email, password_hash, balance FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const user = userResult.rows[0];

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Générer le token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Connexion réussie',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        balance: user.balance
      },
      token
    });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la connexion' });
  }
});

// Route pour obtenir les infos de l'utilisateur connecté
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, username, email, balance, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({
      user: userResult.rows[0]
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour mettre à jour le profil
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const updateSchema = Joi.object({
      username: Joi.string().alphanum().min(3).max(30),
      email: Joi.string().email(),
    });

    const { error, value } = updateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (value.username) {
      updates.push(`username = $${paramIndex}`);
      values.push(value.username);
      paramIndex++;
    }

    if (value.email) {
      updates.push(`email = $${paramIndex}`);
      values.push(value.email);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune modification spécifiée' });
    }

    values.push(req.user.id);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, email, balance`;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Profil mis à jour',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    
    if (error.code === '23505') { // Contrainte unique violée
      return res.status(400).json({ error: 'Ce nom d\'utilisateur ou email est déjà utilisé' });
    }
    
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route de déconnexion (côté client principalement)
router.post('/logout', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Déconnexion réussie'
  });
});

module.exports = router;