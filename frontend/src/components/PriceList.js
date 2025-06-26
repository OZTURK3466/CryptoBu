import React, { useState, useEffect } from 'react';
import { formatPrice, formatChange, getPriceValue, formatLargeNumber, getSymbolForCurrency } from '../utils/currencyUtils';

const PriceList = ({ prices = {}, cryptoNames = {}, onSelectCrypto, selectedCrypto, currency = 'usd' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  // Gérer l'état de chargement
  useEffect(() => {
    if (prices && Object.keys(prices).length > 0) {
      setIsLoading(false);
      setRetryCount(0);
      setLastUpdateTime(new Date());
    } else {
      // Si pas de prix après 2 secondes, considérer comme en chargement
      const timer = setTimeout(() => {
        if (!prices || Object.keys(prices).length === 0) {
          setIsLoading(true);
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [prices]);

  // Fonction de retry
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setIsLoading(true);
    
    // Simuler une tentative de reconnexion
    setTimeout(() => {
      // Recharger la page en dernier recours
      window.location.reload();
    }, 1000);
  };

  // Fonction pour forcer le refresh des prix
  const handleForceRefresh = () => {
    setIsLoading(true);
    setRetryCount(0);
    
    // Tenter de récupérer les prix depuis l'API
    fetch('http://localhost:3001/api/prices')
      .then(response => response.json())
      .then(data => {
        console.log('Prix récupérés manuellement:', data);
        // Cette mise à jour devrait être gérée par le parent (App.js)
        // Mais on peut forcer un refresh de la page si nécessaire
        setTimeout(() => {
          if (!prices || Object.keys(prices).length === 0) {
            window.location.reload();
          }
        }, 3000);
      })
      .catch(error => {
        console.error('Erreur lors du refresh manuel:', error);
        setRetryCount(prev => prev + 1);
      });
  };

  // Vérification de sécurité pour éviter les erreurs
  if (isLoading || !prices || Object.keys(prices).length === 0) {
    return (
      <div className="price-list">
        <h3>
          Prix en Temps Réel 
          <span style={{ 
            fontSize: '0.875rem', 
            fontWeight: '500', 
            color: '#9CA3AF',
            marginLeft: '0.5rem'
          }}>
            ({currency.toUpperCase()})
          </span>
        </h3>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4rem 2rem',
          textAlign: 'center'
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(0, 212, 170, 0.3)',
            borderTop: '4px solid #00D4AA',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '2rem'
          }} />
          
          <h4 style={{ 
            color: '#FFFFFF', 
            marginBottom: '1rem',
            fontSize: '1.25rem'
          }}>
            {retryCount === 0 ? 'Chargement des prix...' : 'Reconnexion en cours...'}
          </h4>
          
          <p style={{ 
            color: '#9CA3AF', 
            marginBottom: '2rem',
            lineHeight: '1.6'
          }}>
            {retryCount === 0 
              ? 'Connexion au flux de données en temps réel'
              : 'Tentative de récupération des données'
            }
            {retryCount > 0 && (
              <>
                <br />
                <small style={{ color: '#F59E0B' }}>
                  Tentative {retryCount + 1}...
                </small>
              </>
            )}
          </p>

          {/* Bouton de refresh manuel toujours disponible */}
          <button
            onClick={handleForceRefresh}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #00D4AA, #00E4BB)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              marginBottom: '2rem'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 4px 12px rgba(0, 212, 170, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
          >
            🔄 Actualiser maintenant
          </button>

          {retryCount >= 2 && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '400px'
            }}>
              <h5 style={{ color: '#F87171', marginBottom: '1rem' }}>
                ⚠️ Problème de connexion
              </h5>
              <p style={{ 
                color: '#9CA3AF', 
                fontSize: '0.875rem',
                marginBottom: '1rem'
              }}>
                Impossible de récupérer les prix. Vérifiez que :
              </p>
              <ul style={{
                color: '#9CA3AF',
                fontSize: '0.875rem',
                textAlign: 'left',
                marginBottom: '1rem',
                paddingLeft: '1rem'
              }}>
                <li>Le backend est démarré (port 3001)</li>
                <li>Votre connexion internet fonctionne</li>
                <li>Le serveur WebSocket répond (port 8080)</li>
              </ul>
              <button
                onClick={handleRetry}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #EF4444, #F87171)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                🔄 Recharger la page
              </button>
            </div>
          )}

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

  const sortedCryptos = Object.keys(prices).sort((a, b) => {
    const priceA = getPriceValue(prices[a], currency) || 0;
    const priceB = getPriceValue(prices[b], currency) || 0;
    return priceB - priceA;
  });

  const getCryptoIcon = (cryptoId) => {
    const icons = {
      bitcoin: '₿',
      ethereum: 'Ξ',
      cardano: '₳',
      polkadot: '●',
      chainlink: '⛓',
      litecoin: 'Ł',
      'bitcoin-cash': '₿',
      stellar: '✦',
      dogecoin: 'Ð',
      polygon: '⬡'
    };
    return icons[cryptoId] || '●';
  };

  const getCryptoColor = (cryptoId) => {
    const colors = {
      bitcoin: 'linear-gradient(135deg, #F7931A 0%, #FFB84D 100%)',
      ethereum: 'linear-gradient(135deg, #627EEA 0%, #8FA8FF 100%)',
      cardano: 'linear-gradient(135deg, #0033AD 0%, #0052E6 100%)',
      polkadot: 'linear-gradient(135deg, #E6007A 0%, #FF4DA1 100%)',
      chainlink: 'linear-gradient(135deg, #375BD2 0%, #5A7FFF 100%)',
      litecoin: 'linear-gradient(135deg, #BFBBBB 0%, #E8E8E8 100%)',
      'bitcoin-cash': 'linear-gradient(135deg, #8DC351 0%, #B8E068 100%)',
      stellar: 'linear-gradient(135deg, #14B6E7 0%, #47D4FF 100%)',
      dogecoin: 'linear-gradient(135deg, #C2A633 0%, #E8C547 100%)',
      polygon: 'linear-gradient(135deg, #8247E5 0%, #A066FF 100%)'
    };
    return colors[cryptoId] || 'linear-gradient(135deg, #00D4AA 0%, #00E4BB 100%)';
  };

  const getPulseColor = (change24h) => {
    if (change24h > 5) return 'rgba(16, 185, 129, 0.4)';
    if (change24h < -5) return 'rgba(239, 68, 68, 0.4)';
    return 'rgba(0, 212, 170, 0.3)';
  };

  const getVolatilityIndicator = () => {
    const changes = Object.values(prices).map(p => Math.abs(p?.usd_24h_change || 0));
    const avgVolatility = changes.reduce((acc, change) => acc + change, 0) / changes.length;
    
    if (avgVolatility > 5) return { text: '🔥 HAUTE', color: '#EF4444' };
    if (avgVolatility > 2) return { text: '📊 NORMALE', color: '#F59E0B' };
    return { text: '😴 FAIBLE', color: '#10B981' };
  };

  const getTotalMarketCap = () => {
    return Object.values(prices).reduce((acc, p) => {
      const marketCap = currency === 'eur' 
        ? (p?.usd_market_cap || 0) * 0.92 // Conversion approximative USD -> EUR
        : (p?.usd_market_cap || 0);
      return acc + marketCap;
    }, 0);
  };

  // Fonction sécurisée pour obtenir le top performer
  const getTopPerformer = () => {
    if (sortedCryptos.length === 0) return 'N/A';
    
    const topCrypto = sortedCryptos.reduce((top, cryptoId) => {
      const change = prices[cryptoId]?.usd_24h_change || 0;
      const topChange = prices[top]?.usd_24h_change || 0;
      return change > topChange ? cryptoId : top;
    }, sortedCryptos[0]);
    
    if (!topCrypto) return 'N/A';
    
    const cryptoName = cryptoNames[topCrypto] || topCrypto || 'Unknown';
    const displayName = typeof cryptoName === 'string' && cryptoName.length > 0 
      ? cryptoName.split(' ')[0] 
      : 'Unknown';
    
    return getCryptoIcon(topCrypto) + ' ' + displayName;
  };

  const volatility = getVolatilityIndicator();
  const totalMarketCap = getTotalMarketCap();

  return (
    <div className="price-list">
      <h3>
        Prix en Temps Réel 
        <span style={{ 
          fontSize: '0.875rem', 
          fontWeight: '500', 
          color: '#9CA3AF',
          marginLeft: '0.5rem'
        }}>
          ({currency.toUpperCase()})
        </span>
        {/* Indicateur de statut en temps réel */}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginLeft: '1rem',
          fontSize: '0.75rem',
          color: '#10B981'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            background: '#10B981',
            borderRadius: '50%',
            animation: 'pulse 2s ease-in-out infinite'
          }} />
          LIVE
        </span>
      </h3>
      
      {/* Header avec bouton refresh */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
        borderBottom: '1px solid rgba(55, 65, 81, 0.3)',
        background: 'rgba(15, 15, 26, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>
            {sortedCryptos.length} cryptomonnaies
          </span>
          {lastUpdateTime && (
            <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
              Mis à jour: {lastUpdateTime.toLocaleTimeString('fr-FR')}
            </span>
          )}
        </div>
        <button
          onClick={handleForceRefresh}
          style={{
            padding: '0.5rem 1rem',
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
            e.target.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(0, 212, 170, 0.2)';
            e.target.style.transform = 'translateY(0)';
          }}
          title="Actualiser les prix manuellement"
        >
          🔄 Refresh
        </button>
      </div>
      
      <div className="price-list-header">
        <div className="header-row">
          <span>Cryptomonnaie</span>
          <span>Prix ({getSymbolForCurrency(currency)})</span>
          <span>24h</span>
        </div>
      </div>

      <div className="price-list-body">
        {sortedCryptos.map((cryptoId) => {
          const crypto = prices[cryptoId];
          const isSelected = cryptoId === selectedCrypto;
          const change24h = crypto?.usd_24h_change || 0;
          const isPositive = change24h >= 0;
          const currentPrice = getPriceValue(crypto, currency);

          return (
            <div
              key={cryptoId}
              className={`price-row ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectCrypto && onSelectCrypto(cryptoId)}
              style={{
                '--pulse-color': getPulseColor(change24h)
              }}
            >
              <div className="crypto-cell">
                <div 
                  className="crypto-icon"
                  style={{
                    background: getCryptoColor(cryptoId),
                    boxShadow: `0 8px 16px ${getPulseColor(change24h)}, 0 0 0 1px rgba(255, 255, 255, 0.1)`
                  }}
                >
                  <span style={{ zIndex: 2, position: 'relative' }}>
                    {getCryptoIcon(cryptoId)}
                  </span>
                </div>
                <div className="crypto-details">
                  <span className="crypto-name">
                    {cryptoNames[cryptoId] || cryptoId}
                  </span>
                  <span className="crypto-symbol">
                    {cryptoId.replace('-', '').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="price-cell">
                <span className="price">{formatPrice(currentPrice, currency)}</span>
                {currency === 'usd' && crypto?.eur && (
                  <span className="price-eur">≈ {formatPrice(crypto.eur, 'eur')}</span>
                )}
                {currency === 'eur' && crypto?.usd && (
                  <span className="price-eur">≈ {formatPrice(crypto.usd, 'usd')}</span>
                )}
              </div>

              <div className={`change-cell ${isPositive ? 'positive' : 'negative'}`}>
                <span className="change">
                  {formatChange(change24h)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="market-summary">
        <h4>Résumé du Marché ({currency.toUpperCase()})</h4>
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-label">Cryptos Suivies</span>
            <span className="stat-value">{Object.keys(prices).length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Market Cap Total</span>
            <span className="stat-value">{formatLargeNumber(totalMarketCap, currency)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Volatilité</span>
            <span className="stat-value" style={{ color: volatility.color }}>
              {volatility.text}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Status Marché</span>
            <span className="stat-value" style={{ color: '#34D399' }}>🟢 LIVE</span>
          </div>
          <div className="stat">
            <span className="stat-label">Devise Actuelle</span>
            <span className="stat-value" style={{ color: currency === 'usd' ? '#10B981' : '#3B82F6' }}>
              {getSymbolForCurrency(currency)} {currency.toUpperCase()}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Top Performer</span>
            <span className="stat-value" style={{ color: '#34D399' }}>
              {getTopPerformer()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceList;