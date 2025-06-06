import React from 'react';
import { formatPrice, formatChange, getPriceValue, formatLargeNumber, getSymbolForCurrency } from '../utils/currencyUtils';

const PriceList = ({ prices = {}, cryptoNames = {}, onSelectCrypto, selectedCrypto, currency = 'usd' }) => {
  // Vérification de sécurité pour éviter les erreurs
  if (!prices || Object.keys(prices).length === 0) {
    return (
      <div className="price-list">
        <h3>Prix en Temps Réel</h3>
        <div className="loading-message">Chargement des prix...</div>
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
      </h3>
      
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