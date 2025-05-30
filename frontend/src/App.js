import React, { useState, useEffect } from 'react';
import CryptoChart from './components/CryptoChart';
import Portfolio from './components/Portfolio';
import TradingPanel from './components/TradingPanel';
import PriceList from './components/PriceList';
import DiscordInvite from './components/DiscordInvite';
import CryptoSelector from './components/CryptoSelector';
import AnimatedBackground from './components/AnimatedBackground';
import Login from './components/Login';
import Register from './components/Register';
import authService from './services/authService';
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
  const [showRegister, setShowRegister] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

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

  // Vérifier l'authentification au démarrage
  useEffect(() => {
    const checkAuth = async () => {
      setAuthLoading(true);
      
      if (authService.isAuthenticated()) {
        try {
          // Récupérer les données utilisateur actualisées
          const userData = await authService.getCurrentUserData();
          setUser(userData);
          
          // Charger le portfolio de l'utilisateur connecté
          await loadUserPortfolio();
        } catch (error) {
          console.error('Erreur lors de la vérification de l\'auth:', error);
          authService.logout();
          setUser(null);
        }
      }
      
      setAuthLoading(false);
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Animation en cascade pour les composants
  useEffect(() => {
    if (user && !isLoading) {
      // Ajouter les classes d'animation en cascade
      setTimeout(() => {
        const elements = document.querySelectorAll('.main-content > * > *');
        elements.forEach((el, index) => {
          el.classList.add('cascade-animation');
          el.style.animationDelay = `${index * 0.1}s`;
        });
      }, 100);
    }
  }, [user, isLoading]);

  // Fonction pour charger le portfolio de l'utilisateur connecté
  const loadUserPortfolio = async () => {
    try {
      const response = await authService.apiCall(`${API_BASE_URL}/portfolio`);
      
      if (response.ok) {
        const portfolioData = await response.json();
        setPortfolio(portfolioData);
      } else {
        console.error('Erreur lors du chargement du portfolio');
        setPortfolio({ holdings: [], total_crypto_value: 0, cash_balance: 0 });
      }
    } catch (error) {
      console.error('Erreur lors du chargement du portfolio:', error);
      setPortfolio({ holdings: [], total_crypto_value: 0, cash_balance: 0 });
    }
  };

  // Fonction pour effectuer un trade avec authentification
  const executeTrade = async (type, cryptoId, amount) => {
    if (!user) {
      createErrorNotification('Vous devez être connecté pour trader');
      return;
    }
    
    try {
      const response = await authService.apiCall(`${API_BASE_URL}/${type}`, {
        method: 'POST',
        body: JSON.stringify({
          crypto_id: cryptoId,
          ...(type === 'buy' ? { amount_usd: amount } : { quantity: amount })
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Recharger les données utilisateur et portfolio
        await Promise.all([
          authService.getCurrentUserData(),
          loadUserPortfolio()
        ]);
        
        // Mettre à jour l'état local avec les nouvelles données utilisateur
        setUser(authService.getCurrentUser());
        
        // Animation de succès
        createSuccessNotification(type, cryptoId, amount);
      } else {
        // Animation d'erreur
        createErrorNotification(result.error);
      }
    } catch (error) {
      console.error('Erreur lors du trade:', error);
      
      if (error.message === 'Session expirée') {
        createErrorNotification('Session expirée, veuillez vous reconnecter');
        handleLogout();
      } else {
        createErrorNotification('Erreur lors de la transaction');
      }
    }
  };

  // Handlers d'authentification
  const handleLogin = async (userData) => {
    setUser(userData);
    await loadUserPortfolio();
    createSuccessNotification('auth', 'login', userData.username);
  };

  const handleRegister = async (userData) => {
    setUser(userData);
    await loadUserPortfolio();
    createSuccessNotification('auth', 'register', userData.username);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setPortfolio({ holdings: [], total_crypto_value: 0, cash_balance: 0 });
    
    // Animation de déconnexion
    createInfoNotification('Déconnexion réussie');
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
      max-width: 300px;
    `;
    
    let message = '';
    if (type === 'auth') {
      if (cryptoId === 'login') {
        message = `🎉 Bienvenue ${amount}!<br><small>Connexion réussie</small>`;
      } else if (cryptoId === 'register') {
        message = `🎉 Bienvenue ${amount}!<br><small>Compte créé avec succès</small>`;
      }
    } else {
      message = `🎉 ${type === 'buy' ? 'Achat' : 'Vente'} réussi!<br><small>${cryptoId.toUpperCase()} - ${amount} ${type === 'buy' ? 'USD' : 'unités'}</small>`;
    }
    
    notification.innerHTML = message;
    
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
      max-width: 300px;
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

  // Notification d'information
  const createInfoNotification = (message) => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #3B82F6, #60A5FA);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
      z-index: 10000;
      font-weight: 600;
      transform: translateX(100%);
      transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      max-width: 300px;
    `;
    
    notification.innerHTML = `ℹ️ ${message}`;
    
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

  // Loading screen pendant la vérification de l'auth
  if (authLoading) {
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
            🔐 Vérification de l'authentification...
          </h2>
          <p style={{ color: '#9CA3AF', fontSize: '1.1rem' }}>
            Chargement de votre session...
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

  // Afficher l'écran d'authentification si pas connecté
  if (!user) {
    return (
      <div className="app">
        <AnimatedBackground />
        {showRegister ? (
          <Register 
            onRegister={handleRegister}
            onSwitchToLogin={() => setShowRegister(false)}
          />
        ) : (
          <Login 
            onLogin={handleLogin}
            onSwitchToRegister={() => setShowRegister(true)}
          />
        )}
      </div>
    );
  }

  // Loading screen pour les données utilisateur
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
          <p style={{ color: '#9CA3AF', fontSize: '1.1rem', textAlign: 'center' }}>
            Bienvenue {user.username}!<br/>
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

  // Interface principale avec utilisateur connecté
  return (
    <div className="app">
      {/* Arrière-plan animé */}
      <AnimatedBackground />

      <header className="app-header cascade-animation">
        <h1>🚀 Crypto Trading Simulator</h1>
        <div className="user-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{
              width: '2.5rem',
              height: '2.5rem',
              background: 'linear-gradient(135deg, #00D4AA, #7C3AED)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: '#0B0B0F'
            }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                Bienvenue, {user.username}
              </span>
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                {user.email}
              </div>
            </div>
          </div>
          <span className="balance">
            Solde: ${user.balance ? parseFloat(user.balance).toFixed(2) : '0.00'}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button
              onClick={() => authService.getCurrentUserData().then(setUser)}
              style={{
                padding: '0.5rem 0.75rem',
                background: 'rgba(0, 212, 170, 0.2)',
                border: '1px solid rgba(0, 212, 170, 0.5)',
                color: '#00D4AA',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(0, 212, 170, 0.3)';
                e.target.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(0, 212, 170, 0.2)';
                e.target.style.color = '#00D4AA';
              }}
              title="Actualiser les données"
            >
              🔄 Refresh
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '0.5rem 0.75rem',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                color: '#F87171',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(239, 68, 68, 0.3)';
                e.target.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(239, 68, 68, 0.2)';
                e.target.style.color = '#F87171';
              }}
            >
              🚪 Déconnexion
            </button>
          </div>
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