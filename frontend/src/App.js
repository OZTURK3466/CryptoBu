import React, { useState, useEffect } from 'react';
import CryptoChart from './components/CryptoChart';
import Portfolio from './components/Portfolio';
import TradingPanel from './components/TradingPanel';
import PriceList from './components/PriceList';
import DiscordInvite from './components/DiscordInvite';
import CryptoSelector from './components/CryptoSelector';
import './App.css';

const API_BASE_URL = 'http://localhost:3001/api';
const WS_URL = 'ws://localhost:8080';

function App() {
  const [prices, setPrices] = useState({});
  const [selectedCrypto, setSelectedCrypto] = useState('bitcoin');
  const [user, setUser] = useState(null);
  const [portfolio, setPortfolio] = useState({ holdings: [], total_crypto_value: 0, cash_balance: 0 });
  const [ws, setWs] = useState(null);

  // Connexion WebSocket pour les prix en temps réel
  useEffect(() => {
    const websocket = new WebSocket(WS_URL);
    
    websocket.onopen = () => {
      console.log('Connecté au WebSocket');
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'price_update') {
        setPrices(data.data);
      }
    };
    
    websocket.onclose = () => {
      console.log('Connexion WebSocket fermée');
      // Reconnexion automatique après 5 secondes
      setTimeout(() => {
        const newWs = new WebSocket(WS_URL);
        setWs(newWs);
      }, 5000);
    };
    
    websocket.onerror = (error) => {
      console.error('Erreur WebSocket:', error);
    };
    
    setWs(websocket);
    
    return () => {
      websocket.close();
    };
  }, []);

  // Charger l'utilisateur demo au démarrage
  useEffect(() => {
    loadUser(1); // ID utilisateur demo
  }, []);

  // Charger les données utilisateur
  const loadUser = async (userId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`);
      const userData = await response.json();
      setUser(userData);
      
      // Charger le portefeuille
      const portfolioResponse = await fetch(`${API_BASE_URL}/users/${userId}/portfolio`);
      const portfolioData = await portfolioResponse.json();
      setPortfolio(portfolioData);
    } catch (error) {
      console.error('Erreur lors du chargement de l\'utilisateur:', error);
    }
  };

  // Fonction pour effectuer un trade
  const executeTrade = async (type, cryptoId, amount) => {
    if (!user) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/users/${user.id}/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          crypto_id: cryptoId,
          ...(type === 'buy' ? { amount_usd: amount } : { quantity: amount })
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Recharger les données utilisateur
        loadUser(user.id);
        alert(`${type === 'buy' ? 'Achat' : 'Vente'} réussi(e) !`);
      } else {
        alert(`Erreur: ${result.error}`);
      }
    } catch (error) {
      console.error('Erreur lors du trade:', error);
      alert('Erreur lors de la transaction');
    }
  };

  const cryptoNames = {
    bitcoin: 'Bitcoin',
    ethereum: 'Ethereum',
    cardano: 'Cardano',
    polkadot: 'Polkadot',
    chainlink: 'Chainlink',
    litecoin: 'Litecoin',
    'bitcoin-cash': 'Bitcoin Cash',
    stellar: 'Stellar',
    dogecoin: 'Dogecoin',
    polygon: 'Polygon'
  };

  if (!user) {
    return (
      <div className="app">
        <div className="loading">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚀 Crypto Trading Simulator</h1>
        <div className="user-info">
          <span>Bienvenue, {user.username}</span>
          <span className="balance">Solde: ${user.balance ? parseFloat(user.balance).toFixed(2) : '0.00'}</span>
        </div>
      </header>

      <div className="main-content">
        <div className="left-panel">
          {/* Nouveau CryptoSelector à la place de l'ancien */}
          <CryptoSelector
            selectedCrypto={selectedCrypto}
            onSelectCrypto={setSelectedCrypto}
            cryptoNames={cryptoNames}
            prices={prices}
          />

          <CryptoChart 
            cryptoId={selectedCrypto}
            currentPrice={prices[selectedCrypto]?.usd}
          />

          <TradingPanel
            selectedCrypto={selectedCrypto}
            currentPrice={prices[selectedCrypto]?.usd}
            onTrade={executeTrade}
            userBalance={parseFloat(user.balance || 0)}
          />

          <DiscordInvite />
        </div>

        <div className="right-panel">
          <PriceList 
            prices={prices}
            cryptoNames={cryptoNames}
            onSelectCrypto={setSelectedCrypto}
            selectedCrypto={selectedCrypto}
          />

          <Portfolio 
            portfolio={portfolio}
            prices={prices}
            cryptoNames={cryptoNames}
            onTrade={executeTrade}
          />
        </div>
      </div>
    </div>
  );
}

export default App;