// backend/routes/admin.js
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const router = express.Router();

const pool = new Pool({
  user: process.env.DB_USER || 'crypto_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'crypto_trading',
  password: process.env.DB_PASSWORD || 'crypto_password',
  port: process.env.DB_PORT || 5432,
});

// Middleware d'authentification admin simple
const adminAuth = (req, res, next) => {
  const { authorization } = req.headers;
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  if (!authorization || authorization !== `Bearer ${adminPassword}`) {
    return res.status(401).json({ error: 'Accès non autorisé' });
  }
  next();
};

// Interface HTML du panel admin
router.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CryptoBu Admin Panel</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #0B0B0F 0%, #1A1A2E 100%);
                color: #FFFFFF;
                min-height: 100vh;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 2rem;
            }
            .header {
                text-align: center;
                margin-bottom: 3rem;
                padding: 2rem;
                background: rgba(26, 26, 46, 0.6);
                border-radius: 12px;
                border: 1px solid rgba(0, 212, 170, 0.3);
            }
            .header h1 {
                background: linear-gradient(135deg, #00D4AA, #7C3AED);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                font-size: 2.5rem;
                margin-bottom: 0.5rem;
            }
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 1.5rem;
                margin-bottom: 3rem;
            }
            .stat-card {
                background: rgba(26, 26, 46, 0.6);
                padding: 2rem;
                border-radius: 12px;
                border: 1px solid rgba(55, 65, 81, 0.3);
                text-align: center;
                transition: all 0.3s ease;
            }
            .stat-card:hover {
                border-color: rgba(0, 212, 170, 0.5);
                transform: translateY(-5px);
            }
            .stat-number {
                font-size: 3rem;
                font-weight: bold;
                color: #00D4AA;
                font-family: 'Courier New', monospace;
            }
            .stat-label {
                color: #9CA3AF;
                margin-top: 0.5rem;
                font-size: 1.1rem;
            }
            .section {
                background: rgba(26, 26, 46, 0.6);
                border-radius: 12px;
                border: 1px solid rgba(55, 65, 81, 0.3);
                margin-bottom: 2rem;
                overflow: hidden;
            }
            .section-header {
                background: rgba(15, 15, 26, 0.8);
                padding: 1.5rem 2rem;
                border-bottom: 1px solid rgba(55, 65, 81, 0.3);
            }
            .section-header h2 {
                color: #00D4AA;
                font-size: 1.5rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            .section-content {
                padding: 2rem;
            }
            .btn {
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                transition: all 0.3s ease;
                margin: 0.25rem;
            }
            .btn-primary {
                background: linear-gradient(135deg, #00D4AA, #00E4BB);
                color: #0B0B0F;
            }
            .btn-danger {
                background: linear-gradient(135deg, #EF4444, #F87171);
                color: white;
            }
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }
            .table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 1rem;
            }
            .table th, .table td {
                padding: 1rem;
                text-align: left;
                border-bottom: 1px solid rgba(55, 65, 81, 0.3);
            }
            .table th {
                background: rgba(15, 15, 26, 0.8);
                color: #00D4AA;
                font-weight: 600;
            }
            .table tbody tr:hover {
                background: rgba(0, 212, 170, 0.1);
            }
            .search-box {
                width: 100%;
                padding: 1rem;
                background: rgba(15, 15, 26, 0.8);
                border: 1px solid rgba(55, 65, 81, 0.5);
                border-radius: 8px;
                color: #FFFFFF;
                margin-bottom: 1rem;
            }
            .search-box:focus {
                outline: none;
                border-color: #00D4AA;
            }
            .modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 1000;
            }
            .modal-content {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(26, 26, 46, 0.95);
                padding: 2rem;
                border-radius: 12px;
                border: 1px solid rgba(55, 65, 81, 0.3);
                width: 90%;
                max-width: 500px;
            }
            .loading {
                text-align: center;
                padding: 2rem;
                color: #9CA3AF;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀 CryptoBu Admin Panel</h1>
                <p>Interface d'administration pour la gestion de la plateforme</p>
            </div>

            <!-- Statistiques -->
            <div class="stats-grid" id="statsGrid">
                <div class="stat-card">
                    <div class="stat-number" id="totalUsers">-</div>
                    <div class="stat-label">👥 Utilisateurs totaux</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="totalTransactions">-</div>
                    <div class="stat-label">💱 Transactions</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="totalVolume">-</div>
                    <div class="stat-label">💰 Volume total</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="activeTraders">-</div>
                    <div class="stat-label">📈 Traders actifs</div>
                </div>
            </div>

            <!-- Gestion des utilisateurs -->
            <div class="section">
                <div class="section-header">
                    <h2>👥 Gestion des Utilisateurs</h2>
                </div>
                <div class="section-content">
                    <input type="text" class="search-box" id="userSearch" placeholder="🔍 Rechercher un utilisateur...">
                    <button class="btn btn-primary" onclick="refreshUsers()">🔄 Actualiser</button>
                    <button class="btn btn-primary" onclick="exportUsers()">📥 Exporter CSV</button>
                    
                    <div id="usersTable">
                        <div class="loading">Chargement des utilisateurs...</div>
                    </div>
                </div>
            </div>

            <!-- Transactions récentes -->
            <div class="section">
                <div class="section-header">
                    <h2>💱 Transactions Récentes</h2>
                </div>
                <div class="section-content">
                    <button class="btn btn-primary" onclick="refreshTransactions()">🔄 Actualiser</button>
                    
                    <div id="transactionsTable">
                        <div class="loading">Chargement des transactions...</div>
                    </div>
                </div>
            </div>

            <!-- Outils d'administration -->
            <div class="section">
                <div class="section-header">
                    <h2>🔧 Outils d'Administration</h2>
                </div>
                <div class="section-content">
                    <button class="btn btn-primary" onclick="resetUserBalance()">💰 Réinitialiser solde utilisateur</button>
                    <button class="btn btn-danger" onclick="cleanupOldSessions()">🧹 Nettoyer sessions expirées</button>
                    <button class="btn btn-primary" onclick="generateReport()">📊 Générer rapport</button>
                    <button class="btn btn-danger" onclick="backupDatabase()">💾 Sauvegarde BDD</button>
                </div>
            </div>
        </div>

        <!-- Modal de confirmation -->
        <div id="confirmModal" class="modal">
            <div class="modal-content">
                <h3 id="confirmTitle">Confirmation</h3>
                <p id="confirmMessage">Êtes-vous sûr de vouloir effectuer cette action ?</p>
                <div style="margin-top: 2rem; text-align: right;">
                    <button class="btn" onclick="closeModal()">Annuler</button>
                    <button class="btn btn-danger" id="confirmBtn" onclick="confirmAction()">Confirmer</button>
                </div>
            </div>
        </div>

        <script>
            let currentAction = null;
            let actionData = null;

            // Chargement initial
            document.addEventListener('DOMContentLoaded', function() {
                loadStats();
                loadUsers();
                loadTransactions();
            });

            // Authentification simple
            const API_BASE = window.location.origin + '/api';
            const ADMIN_TOKEN = prompt('Mot de passe admin:') || 'admin123';

            async function apiCall(endpoint, options = {}) {
                try {
                    const response = await fetch(API_BASE + endpoint, {
                        ...options,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': \`Bearer \${ADMIN_TOKEN}\`,
                            ...options.headers
                        }
                    });
                    return await response.json();
                } catch (error) {
                    console.error('Erreur API:', error);
                    return { error: error.message };
                }
            }

            async function loadStats() {
                const stats = await apiCall('/admin/stats');
                if (!stats.error) {
                    document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
                    document.getElementById('totalTransactions').textContent = stats.totalTransactions || 0;
                    document.getElementById('totalVolume').textContent = '$' + (stats.totalVolume || 0).toFixed(2);
                    document.getElementById('activeTraders').textContent = stats.activeTraders || 0;
                }
            }

            async function loadUsers() {
                const users = await apiCall('/admin/users');
                const container = document.getElementById('usersTable');
                
                if (users.error) {
                    container.innerHTML = '<div class="loading">Erreur de chargement</div>';
                    return;
                }

                let html = '<table class="table"><thead><tr>';
                html += '<th>ID</th><th>Nom</th><th>Email</th><th>Solde</th><th>Créé le</th><th>Actions</th>';
                html += '</tr></thead><tbody>';

                users.forEach(user => {
                    html += \`<tr>
                        <td>\${user.id}</td>
                        <td>\${user.username}</td>
                        <td>\${user.email}</td>
                        <td>$\${parseFloat(user.balance).toFixed(2)}</td>
                        <td>\${new Date(user.created_at).toLocaleDateString('fr-FR')}</td>
                        <td>
                            <button class="btn btn-primary" onclick="editUser(\${user.id})">✏️</button>
                            <button class="btn btn-danger" onclick="deleteUser(\${user.id}, '\${user.username}')">🗑️</button>
                        </td>
                    </tr>\`;
                });

                html += '</tbody></table>';
                container.innerHTML = html;
            }

            async function loadTransactions() {
                const transactions = await apiCall('/admin/transactions');
                const container = document.getElementById('transactionsTable');
                
                if (transactions.error) {
                    container.innerHTML = '<div class="loading">Erreur de chargement</div>';
                    return;
                }

                let html = '<table class="table"><thead><tr>';
                html += '<th>ID</th><th>Utilisateur</th><th>Crypto</th><th>Type</th><th>Quantité</th><th>Prix</th><th>Total</th><th>Date</th>';
                html += '</tr></thead><tbody>';

                transactions.forEach(tx => {
                    const typeColor = tx.type === 'buy' ? '#10B981' : '#EF4444';
                    html += \`<tr>
                        <td>\${tx.id}</td>
                        <td>\${tx.user_id}</td>
                        <td>\${tx.crypto_id.toUpperCase()}</td>
                        <td style="color: \${typeColor}">\${tx.type.toUpperCase()}</td>
                        <td>\${parseFloat(tx.quantity).toFixed(6)}</td>
                        <td>$\${parseFloat(tx.price).toFixed(2)}</td>
                        <td>$\${parseFloat(tx.total_amount).toFixed(2)}</td>
                        <td>\${new Date(tx.created_at).toLocaleDateString('fr-FR')}</td>
                    </tr>\`;
                });

                html += '</tbody></table>';
                container.innerHTML = html;
            }

            function deleteUser(userId, username) {
                showConfirmModal(
                    'Supprimer l\\'utilisateur',
                    \`Êtes-vous sûr de vouloir supprimer l'utilisateur "\${username}" ? Cette action est irréversible.\`,
                    () => executeDeleteUser(userId)
                );
            }

            async function executeDeleteUser(userId) {
                const result = await apiCall(\`/admin/users/\${userId}\`, { method: 'DELETE' });
                if (!result.error) {
                    alert('Utilisateur supprimé avec succès');
                    loadUsers();
                    loadStats();
                } else {
                    alert('Erreur: ' + result.error);
                }
            }

            function showConfirmModal(title, message, callback) {
                document.getElementById('confirmTitle').textContent = title;
                document.getElementById('confirmMessage').textContent = message;
                document.getElementById('confirmModal').style.display = 'block';
                currentAction = callback;
            }

            function closeModal() {
                document.getElementById('confirmModal').style.display = 'none';
                currentAction = null;
            }

            function confirmAction() {
                if (currentAction) {
                    currentAction();
                }
                closeModal();
            }

            function refreshUsers() { loadUsers(); }
            function refreshTransactions() { loadTransactions(); }

            // Recherche utilisateurs
            document.getElementById('userSearch').addEventListener('input', function(e) {
                const searchTerm = e.target.value.toLowerCase();
                const rows = document.querySelectorAll('#usersTable tbody tr');
                
                rows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(searchTerm) ? '' : 'none';
                });
            });

            // Fonctions d'outils admin (à implémenter)
            function resetUserBalance() {
                const userId = prompt('ID de l\\'utilisateur:');
                const amount = prompt('Nouveau solde:');
                if (userId && amount) {
                    // Implémenter la logique
                    alert('Fonctionnalité à implémenter');
                }
            }

            function cleanupOldSessions() {
                alert('Nettoyage des sessions - Fonctionnalité à implémenter');
            }

            function generateReport() {
                alert('Génération de rapport - Fonctionnalité à implémenter');
            }

            function backupDatabase() {
                alert('Sauvegarde BDD - Fonctionnalité à implémenter');
            }

            function exportUsers() {
                alert('Export CSV - Fonctionnalité à implémenter');
            }

            function editUser(userId) {
                alert(\`Éditer utilisateur \${userId} - Fonctionnalité à implémenter\`);
            }
        </script>
    </body>
    </html>
  `);
});

// Routes API pour l'admin
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [usersResult, transactionsResult, portfolioResult, volumeResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as total_users FROM users'),
      pool.query('SELECT COUNT(*) as total_transactions FROM transactions'),
      pool.query('SELECT COUNT(DISTINCT user_id) as active_traders FROM portfolio'),
      pool.query('SELECT SUM(total_amount) as total_volume FROM transactions')
    ]);

    res.json({
      totalUsers: parseInt(usersResult.rows[0].total_users),
      totalTransactions: parseInt(transactionsResult.rows[0].total_transactions),
      activeTraders: parseInt(portfolioResult.rows[0].active_traders),
      totalVolume: parseFloat(volumeResult.rows[0].total_volume || 0)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, username, email, balance, created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/transactions', adminAuth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*, u.username 
      FROM transactions t 
      LEFT JOIN users u ON t.user_id = u.id 
      ORDER BY t.created_at DESC 
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Supprimer d'abord les données liées
    await pool.query('DELETE FROM transactions WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM portfolio WHERE user_id = $1', [id]);
    
    // Puis supprimer l'utilisateur
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING username', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    res.json({ success: true, message: `Utilisateur ${result.rows[0].username} supprimé` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:id/balance', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { balance } = req.body;
    
    const result = await pool.query(
      'UPDATE users SET balance = $1 WHERE id = $2 RETURNING username, balance',
      [balance, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    res.json({ 
      success: true, 
      message: `Solde de ${result.rows[0].username} mis à jour`,
      newBalance: result.rows[0].balance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;