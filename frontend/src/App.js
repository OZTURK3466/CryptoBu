import React, { useState, useEffect } from 'react';
import CryptoChart from './components/CryptoChart';
import Portfolio from './components/Portfolio';
import TradingPanel from './components/TradingPanel';
import PriceList from './components/PriceList';
import DiscordInvite from './components/DiscordInvite';
import CryptoSelector from './components/CryptoSelector';
import AnimatedBackground from './components/AnimatedBackground';
import './App.css';

const API_BASE_URL = 'http://localhost:3001/api';
const WS_URL = 'ws://localhost:8080';

function App() {
  const [prices, setPrices] = useState({});
  const [selectedCrypto, setSelectedCrypto] = useState('bitcoin');
  const [user, setUser] = useState(null);
  const [portfolio, setPortfolio] = useState({ holdings: [], total_crypto_value: 0, cash_balance: 0 });
  const [ws, setWs] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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

  // Animation en cascade pour les composants
  useEffect(() => {
    if (user) {
      setIsLoading(false);
      
      // Ajouter les classes d'animation en cascade
      const elements = document.querySelectorAll('.main-content > * > *');
      elements.forEach((el, index) => {
        el.classList.add('cascade-animation');
        el.style.animationDelay = `${index * 0.1}s`;
      });
    }
  }, [user]);

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
      setIsLoading(false);
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
        
        // Animation de succès
        createSuccessNotification(type, cryptoId, amount);
      } else {
        // Animation d'erreur
        createErrorNotification(result.error);
      }
    } catch (error) {
      console.error('Erreur lors du trade:', error);
      createErrorNotification('Erreur lors de la transaction');
    }
  };

  // Notification de succès animée
  const createSuccessNotification = (type, cryptoId, amount) => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #10B981, #14C085);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
      z-index: 10000;
      font-weight: 600;
      transform: translateX(100%);
      transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    `;
    
    notification.innerHTML = `
      🎉 ${type === 'buy' ? 'Achat' : 'Vente'} réussi!<br>
      <small>${cryptoId.toUpperCase()} - ${amount} ${type === 'buy' ? 'USD' : 'unités'}</small>
    `;
    
    document.body.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Animation de sortie
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 500);
    }, 3000);
  };

  // Notification d'erreur animée
  const createErrorNotification = (message) => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #EF4444, #F87171);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
      z-index: 10000;
      font-weight: 600;
      transform: translateX(100%);
      transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    `;
    
    notification.innerHTML = `❌ ${message}`;
    
    document.body.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Animation de sortie
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 500);
    }, 4000);
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

  // Loading screen avec animation
  if (isLoading) {
    return (
      <div className="app">
        <AnimatedBackground />
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(11, 11, 15, 0.9)',
          backdropFilter: 'blur(10px)',
          zIndex: 1000
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            border: '4px solid rgba(0, 212, 170, 0.3)',
            borderTop: '4px solid #00D4AA',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '2rem'
          }} />
          <h2 style={{
            background: 'linear-gradient(135deg, #00D4AA, #7C3AED)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: '2rem',
            fontWeight: '800',
            marginBottom: '1rem',
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            🚀 Crypto Trading Simulator
          </h2>
          <p style={{ color: '#9CA3AF', fontSize: '1.1rem' }}>
            Chargement de votre espace de trading...
          </p>
          <div style={{
            marginTop: '2rem',
            display: 'flex',
            gap: '0.5rem'
          }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: '8px',
                height: '8px',
                background: '#00D4AA',
                borderRadius: '50%',
                animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite both`
              }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app">
        <AnimatedBackground />
        <div className="loading">
          <div style={{
            fontSize: '4rem',
            marginBottom: '1rem',
            animation: 'bounce 2s ease-in-out infinite'
          }}>⚠️</div>
          <p>Erreur de connexion au serveur</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #00D4AA, #00E4BB)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            🔄 Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Arrière-plan animé */}
      <AnimatedBackground />

      <header className="app-header cascade-animation">
        <h1>🚀 Crypto Trading Simulator</h1>
        <div className="user-info">
          <span>Bienvenue, {user.username}</span>
          <span className="balance">
            Solde: ${user.balance ? parseFloat(user.balance).toFixed(2) : '0.00'}
          </span>
        </div>
      </header>

      <div className="main-content">
        <div className="left-panel">
          <div className="cascade-animation">
            <CryptoSelector
              selectedCrypto={selectedCrypto}
              onSelectCrypto={setSelectedCrypto}
              cryptoNames={cryptoNames}
              prices={prices}
            />
          </div>

          <div className="cascade-animation">
            <CryptoChart 
              cryptoId={selectedCrypto}
              currentPrice={prices[selectedCrypto]?.usd}
            />
          </div>

          <div className="cascade-animation">
            <TradingPanel
              selectedCrypto={selectedCrypto}
              currentPrice={prices[selectedCrypto]?.usd}
              onTrade={executeTrade}
              userBalance={parseFloat(user.balance || 0)}
            />
          </div>

          <div className="cascade-animation">
            <DiscordInvite />
          </div>
        </div>

        <div className="right-panel">
          <div className="cascade-animation">
            <PriceList 
              prices={prices}
              cryptoNames={cryptoNames}
              onSelectCrypto={setSelectedCrypto}
              selectedCrypto={selectedCrypto}
            />
          </div>

          <div className="cascade-animation">
            <Portfolio 
              portfolio={portfolio}
              prices={prices}
              cryptoNames={cryptoNames}
              onTrade={executeTrade}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;