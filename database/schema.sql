-- Création de la base de données
CREATE DATABASE crypto_trading;

-- Utiliser la base de données
\c crypto_trading;

-- Table des utilisateurs
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 10000.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table du portefeuille (holdings)
CREATE TABLE portfolio (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    crypto_id VARCHAR(50) NOT NULL, -- ID CoinGecko (bitcoin, ethereum, etc.)
    quantity DECIMAL(20, 8) NOT NULL,
    avg_buy_price DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, crypto_id)
);

-- Table des transactions
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    crypto_id VARCHAR(50) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('buy', 'sell')),
    quantity DECIMAL(20, 8) NOT NULL,
    price DECIMAL(15, 2) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table pour stocker les prix historiques (optionnel, pour cache local)
CREATE TABLE price_history (
    id SERIAL PRIMARY KEY,
    crypto_id VARCHAR(50) NOT NULL,
    price_usd DECIMAL(15, 2) NOT NULL,
    price_eur DECIMAL(15, 2) NOT NULL,
    volume_24h DECIMAL(20, 2),
    market_cap DECIMAL(20, 2),
    change_24h DECIMAL(8, 4),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances
CREATE INDEX idx_portfolio_user_id ON portfolio(user_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_price_history_crypto_timestamp ON price_history(crypto_id, timestamp);

-- Fonction pour mettre à jour le timestamp updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_updated_at BEFORE UPDATE ON portfolio
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Données de test
INSERT INTO users (username, email, balance) VALUES 
    ('demo_user', 'demo@example.com', 10000.00),
    ('test_trader', 'trader@example.com', 15000.00);

-- Quelques transactions de test
INSERT INTO portfolio (user_id, crypto_id, quantity, avg_buy_price) VALUES 
    (1, 'bitcoin', 0.05, 45000.00),
    (1, 'ethereum', 0.5, 3000.00),
    (2, 'bitcoin', 0.1, 50000.00);

INSERT INTO transactions (user_id, crypto_id, type, quantity, price, total_amount) VALUES 
    (1, 'bitcoin', 'buy', 0.05, 45000.00, 2250.00),
    (1, 'ethereum', 'buy', 0.5, 3000.00, 1500.00),
    (2, 'bitcoin', 'buy', 0.1, 50000.00, 5000.00);