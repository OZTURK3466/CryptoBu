import React, { useState, useEffect } from 'react';
import CryptoChart from './components/CryptoChart';
import Portfolio from './components/Portfolio';
import TradingPanel from './components/TradingPanel';
import PriceList from './components/PriceList';
import DiscordInvite from './components/DiscordInvite';
import CryptoSelector from './components/CryptoSelector';
import CurrencySwitch from './components/CurrencySwitch';
import AnimatedBackground from './components/AnimatedBackground';
import Login from './components/Login';
import Register from './components/Register';
import authService from './services/authService';
import { getCurrencyPreference, saveCurrencyPreference, formatPrice, getPriceValue } from './utils/currencyUtils';
import './App.css';

const API_BASE_URL = 'http://localhost:3001/api';
const WS_URL = 'ws://localhost:8080';

function App() {
  const [prices, setPrices] = useState({});
  const [selectedCrypto, setSelectedCrypto] = useState('bitcoin');
  const [currency, setCurrency] = useState(getCurrencyPreference());
  const [user, setUser] = useState(null);
  const [portfolio, setPortfolio] = useState({ holdings: [], total_crypto_value: 0, cash_balance: 0 });
  const [ws, setWs] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [backendReady, setBackendReady] = useState(false);

  // Gérer le changement de devise
  const handleCurrencyChange = (newCurrency) => {
    setCurrency(newCurrency);
    saveCurrencyPreference(newCurrency);
    
    // Animation de feedback
    createInfoNotification(`Devise changée vers ${newCurrency.toUpperCase()}`);
  };

  // Vérifier si le backend est prêt
  const checkBackendHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        setBackendReady(true);
        return true;
      }
    } catch (error) {
      console.log('Backend pas encore prêt...');
    }
    return false;
  };

  // Attendre que le backend soit prêt avant de connecter WebSocket
  useEffect(() => {
    const waitForBackend = async () => {
      let attempts = 0;
      const maxAttempts = 30;
      
      while (!backendReady && attempts < maxAttempts) {
        const isReady = await checkBackendHealth();
        if (isReady) break;
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (!backendReady && attempts >= maxAttempts) {
        console.error('Backend non accessible après 30 tentatives');
      }
    };

    waitForBackend();
  }, [backendReady]);

  // Fonction pour récupérer les prix depuis l'API REST en fallback
  const fetchPricesFromAPI = async () => {
    try {
      console.log('🔄 Récupération des prix depuis l\'API REST...');
      const response = await fetch(`${API_BASE_URL}/prices`);
      if (response.ok) {
        const pricesData = await response.json();
        console.log('✅ Prix récupérés depuis l\'API REST');
        setPrices(pricesData);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des prix depuis l\'API:', error);
    }
  };

  // Connexion WebSocket pour les prix en temps réel - VERSION CORRIGÉE
  useEffect(() => {
    if (!backendReady) return;

    let websocket = null;
    let reconnectTimeout = null;
    let isManualClose = false; // Flag pour éviter la reconnexion lors de la déconnexion volontaire

    const connectWebSocket = () => {
      // Ne pas reconnecter si c'est une fermeture manuelle (déconnexion)
      if (isManualClose) return;

      try {
        console.log('🔄 Tentative de connexion WebSocket...');
        websocket = new WebSocket(WS_URL);
        
        websocket.onopen = () => {
          console.log('✅ Connecté au WebSocket');
          setWs(websocket);
          
          // Récupérer immédiatement les prix depuis l'API REST en cas de reconnexion
          fetchPricesFromAPI();
        };
        
        websocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'price_update') {
              console.log('📊 Prix mis à jour via WebSocket');
              setPrices(data.data);
            }
          } catch (error) {
            console.error('Erreur parsing WebSocket data:', error);
          }
        };
        
        websocket.onclose = (event) => {
          console.log('🔌 Connexion WebSocket fermée', event.code);
          setWs(null);
          
          // Reconnexion automatique seulement si pas de fermeture manuelle
          if (!isManualClose && event.code !== 1000) {
            console.log('🔄 Programmation de la reconnexion WebSocket dans 3 secondes...');
            reconnectTimeout = setTimeout(() => {
              connectWebSocket();
            }, 3000);
          }
        };
        
        websocket.onerror = (error) => {
          console.error('❌ Erreur WebSocket:', error);
          setWs(null);
        };
        
      } catch (error) {
        console.error('❌ Impossible de créer la connexion WebSocket:', error);
        // Retry after 3 seconds
        if (!isManualClose) {
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        }
      }
    };

    // Connecter immédiatement et récupérer les prix
    connectWebSocket();
    fetchPricesFromAPI(); // Récupérer les prix immédiatement

    return () => {
      console.log('🧹 Nettoyage de la connexion WebSocket...');
      isManualClose = true; // Marquer comme fermeture manuelle
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (websocket) {
        websocket.close(1000); // Code 1000 = fermeture normale
      }
    };
  }, [backendReady, user]); // ← IMPORTANT: 'user' ajouté dans les dépendances

  // Récupérer les prix quand l'utilisateur se connecte
  useEffect(() => {
    if (user && backendReady) {
      console.log('👤 Utilisateur connecté, récupération des prix...');
      // Récupérer les prix immédiatement quand l'utilisateur se connecte
      const fetchInitialPrices = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/prices`);
          if (response.ok) {
            const pricesData = await response.json();
            console.log('✅ Prix initiaux récupérés pour l\'utilisateur connecté');
            setPrices(pricesData);
          }
        } catch (error) {
          console.error('❌ Erreur lors de la récupération des prix initiaux:', error);
        }
      };
      
      fetchInitialPrices();
    }
  }, [user, backendReady]);

  // Nettoyer les données à la déconnexion (optionnel)
  useEffect(() => {
    if (!user) {
      console.log('🚪 Utilisateur déconnecté...');
      // Optionnel : garder les prix même déconnecté, ou les effacer
      // setPrices({}); // Décommentez si vous voulez effacer les prix à la déconnexion
    }
  }, [user]);

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

    // Attendre que le backend soit prêt avant de vérifier l'auth
    if (backendReady) {
      checkAuth();
    }
  }, [backendReady]);

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
    
    // Réinitialiser l'état de l'application
    setPrices({});
    setSelectedCrypto('bitcoin');
    
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
      const currencySymbol = currency === 'usd' ? '$' : '€';
      message = `🎉 ${type === 'buy' ? 'Achat' : 'Vente'} réussi!<br><small>${cryptoId.toUpperCase()} - ${currencySymbol}${amount} ${type === 'buy' ? '' : 'unités'}</small>`;
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
  if (authLoading || !backendReady) {
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
            {!backendReady ? '🔧 Démarrage du backend...' : '🔐 Vérification de l\'authentification...'}
          </h2>
          <p style={{ color: '#9CA3AF', fontSize: '1.1rem' }}>
            {!backendReady ? 'Connexion au serveur...' : 'Chargement de votre session...'}
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

  // Si l'utilisateur n'est pas connecté, afficher les écrans de connexion/inscription
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

  // Interface principale avec utilisateur connecté
  return (
    <div className="app">
      {/* Arrière-plan animé */}
      <AnimatedBackground />

      <header className="app-header cascade-animation">
        <h1>🚀 Cryptobu</h1>
        
        {/* Section centrale avec sélecteur de devise */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <CurrencySwitch 
            currency={currency}
            onCurrencyChange={handleCurrencyChange}
          />
        </div>

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
              {user?.username?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                Bienvenue, {user?.username || 'Utilisateur'}
              </span>
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                {user?.email || 'Email non disponible'}
              </div>
            </div>
          </div>
          <span className="balance">
            Solde: {formatPrice(parseFloat(user?.balance || 0), 'usd')}
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
              currency={currency}
            />
          </div>

          <div className="cascade-animation">
            <CryptoChart 
              cryptoId={selectedCrypto}
              currentPrice={getPriceValue(prices[selectedCrypto], currency)}
              currency={currency}
            />
          </div>

          <div className="cascade-animation">
            <TradingPanel
              selectedCrypto={selectedCrypto}
              currentPrice={getPriceValue(prices[selectedCrypto], currency)}
              onTrade={executeTrade}
              userBalance={parseFloat(user?.balance || 0)}
              currency={currency}
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
              currency={currency}
            />
          </div>

          <div className="cascade-animation">
            <Portfolio 
              portfolio={portfolio}
              prices={prices}
              cryptoNames={cryptoNames}
              onTrade={executeTrade}
              currency={currency}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;