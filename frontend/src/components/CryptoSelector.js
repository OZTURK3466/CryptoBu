import React, { useState } from 'react';

const CryptoSelector = ({ selectedCrypto, onSelectCrypto, cryptoNames }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isGridView, setIsGridView] = useState(true);

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

  const cryptoData = Object.keys(cryptoNames).map(cryptoId => ({
    id: cryptoId,
    name: cryptoNames[cryptoId],
    symbol: cryptoId.replace('-', '').toUpperCase(),
    icon: getCryptoIcon(cryptoId),
    color: getCryptoColor(cryptoId)
  }));

  const filteredCryptos = cryptoData.filter(crypto =>
    crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="crypto-selector-modern">
      <div className="selector-header">
        <h3>⚡ Sélectionner une Crypto</h3>
        <div className="view-controls">
          <button
            className={`view-btn ${isGridView ? 'active' : ''}`}
            onClick={() => setIsGridView(true)}
            title="Vue grille"
          >
            ⊞
          </button>
          <button
            className={`view-btn ${!isGridView ? 'active' : ''}`}
            onClick={() => setIsGridView(false)}
            title="Vue liste"
          >
            ☰
          </button>
        </div>
      </div>

      <div className="search-container">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Rechercher une crypto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button
              className="clear-search"
              onClick={() => setSearchTerm('')}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className={`crypto-grid ${isGridView ? 'grid-view' : 'list-view'}`}>
        {filteredCryptos.map(crypto => (
          <div
            key={crypto.id}
            className={`crypto-card ${selectedCrypto === crypto.id ? 'selected' : ''}`}
            onClick={() => onSelectCrypto(crypto.id)}
          >
            <div className="crypto-card-header">
              <div 
                className="crypto-card-icon"
                style={{ background: crypto.color }}
              >
                {crypto.icon}
              </div>
              <div className="crypto-card-info">
                <h4 className="crypto-card-name">{crypto.name}</h4>
                <span className="crypto-card-symbol">{crypto.symbol}</span>
              </div>
              {selectedCrypto === crypto.id && (
                <div className="selected-indicator">
                  ✓
                </div>
              )}
            </div>

            <div className="crypto-card-overlay">
              <span className="overlay-text">Cliquer pour sélectionner</span>
            </div>
          </div>
        ))}
      </div>

      {filteredCryptos.length === 0 && (
        <div className="no-results">
          <div className="no-results-icon">🔍</div>
          <p>Aucune crypto trouvée</p>
          <small>Essayez un autre terme de recherche</small>
        </div>
      )}

      <div className="selector-footer">
        <div className="footer-stats">
          <div className="footer-stat">
            <span className="footer-stat-number">{Object.keys(cryptoNames).length}</span>
            <span className="footer-stat-label">Cryptos disponibles</span>
          </div>
          <div className="footer-stat">
            <span className="footer-stat-number">
              {selectedCrypto ? getCryptoIcon(selectedCrypto) : '—'}
            </span>
            <span className="footer-stat-label">Sélectionnée</span>
          </div>
          <div className="footer-stat">
            <span className="footer-stat-number">⚡</span>
            <span className="footer-stat-label">Sélection rapide</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CryptoSelector;