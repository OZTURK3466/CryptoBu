import React, { useState } from 'react';
import { formatPrice, getPriceValue, getSymbolForCurrency, formatLargeNumber } from '../utils/currencyUtils';

const Portfolio = ({ portfolio, prices, cryptoNames, onTrade, currency = 'usd' }) => {
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedHolding, setSelectedHolding] = useState(null);
  const [sellQuantity, setSellQuantity] = useState('');

  // Valeurs par défaut sécurisées
  const safePortfolio = portfolio || { 
    total_crypto_value: 0, 
    cash_balance: 0, 
    holdings: [] 
  };
  
  const safePrices = prices || {};
  const safeCryptoNames = cryptoNames || {};

  const handleSellClick = (holding) => {
    setSelectedHolding(holding);
    setSellQuantity('');
    setShowSellModal(true);
  };

  const handleSellConfirm = async () => {
    if (!sellQuantity || parseFloat(sellQuantity) <= 0) {
      alert('Veuillez entrer une quantité valide');
      return;
    }

    const holdingQuantity = parseFloat(selectedHolding?.quantity || 0);
    if (parseFloat(sellQuantity) > holdingQuantity) {
      alert('Quantité insuffisante');
      return;
    }

    try {
      if (onTrade) {
        await onTrade('sell', selectedHolding.crypto_id, parseFloat(sellQuantity));
      }
      setShowSellModal(false);
      setSelectedHolding(null);
      setSellQuantity('');
    } catch (error) {
      console.error('Erreur lors de la vente:', error);
    }
  };

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

  // Convertir les valeurs selon la devise sélectionnée
  const convertValue = (usdValue) => {
    if (currency === 'eur') {
      return usdValue * 0.92; // Conversion approximative USD -> EUR
    }
    return usdValue;
  };

  const totalCryptoValue = convertValue(Number(safePortfolio.total_crypto_value) || 0);
  const cashBalance = convertValue(Number(safePortfolio.cash_balance) || 0);
  const totalPortfolioValue = totalCryptoValue + cashBalance;

  // Calculer les statistiques du portfolio
  const portfolioStats = {
    totalValue: totalPortfolioValue,
    cryptoPercentage: totalPortfolioValue > 0 ? (totalCryptoValue / totalPortfolioValue) * 100 : 0,
    cashPercentage: totalPortfolioValue > 0 ? (cashBalance / totalPortfolioValue) * 100 : 0,
    totalProfitLoss: 0,
    bestPerformer: null,
    worstPerformer: null
  };

  // Calculer le meilleur et pire performer
  if (safePortfolio.holdings && safePortfolio.holdings.length > 0) {
    let bestPL = -Infinity;
    let worstPL = Infinity;
    
    safePortfolio.holdings.forEach(holding => {
      const currentPrice = getPriceValue(safePrices[holding.crypto_id], currency);
      const quantity = Number(holding.quantity) || 0;
      const avgBuyPrice = convertValue(Number(holding.avg_buy_price) || 0);
      const currentValue = quantity * currentPrice;
      const costBasis = quantity * avgBuyPrice;
      const profitLoss = currentValue - costBasis;
      const profitLossPercentage = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;
      
      portfolioStats.totalProfitLoss += profitLoss;
      
      if (profitLossPercentage > bestPL) {
        bestPL = profitLossPercentage;
        portfolioStats.bestPerformer = { ...holding, profitLossPercentage };
      }
      
      if (profitLossPercentage < worstPL) {
        worstPL = profitLossPercentage;
        portfolioStats.worstPerformer = { ...holding, profitLossPercentage };
      }
    });
  }

  return (
    <div className="portfolio">
      <h3>
        Mon Portefeuille
        <span style={{ 
          fontSize: '0.875rem', 
          fontWeight: '500', 
          color: '#9CA3AF',
          marginLeft: '0.5rem'
        }}>
          ({currency.toUpperCase()})
        </span>
      </h3>
      
      <div className="portfolio-summary">
        <div className="summary-row">
          <span>💰 Cryptomonnaies</span>
          <span className="value">{formatPrice(totalCryptoValue, currency)}</span>
        </div>
        <div className="summary-row">
          <span>💵 Liquidités</span>
          <span className="value">{formatPrice(cashBalance, currency)}</span>
        </div>
        <div className="summary-row">
          <span>📊 P&L Total</span>
          <span 
            className="value" 
            style={{ 
              color: portfolioStats.totalProfitLoss >= 0 ? '#34D399' : '#F87171' 
            }}
          >
            {portfolioStats.totalProfitLoss >= 0 ? '+' : ''}{formatPrice(portfolioStats.totalProfitLoss, currency)}
          </span>
        </div>
        <div className="summary-row total">
          <span>🏆 Valeur Totale</span>
          <span className="value">{formatPrice(totalPortfolioValue, currency)}</span>
        </div>
        
        {/* Affichage dans l'autre devise */}
        {currency === 'eur' && (
          <div className="summary-row" style={{ 
            fontSize: '0.875rem', 
            color: '#9CA3AF',
            borderTop: '1px solid rgba(55, 65, 81, 0.3)',
            paddingTop: '0.75rem',
            marginTop: '0.75rem'
          }}>
            <span>≈ Équivalent USD</span>
            <span>${(totalPortfolioValue / 0.92).toFixed(2)}</span>
          </div>
        )}
        {currency === 'usd' && (
          <div className="summary-row" style={{ 
            fontSize: '0.875rem', 
            color: '#9CA3AF',
            borderTop: '1px solid rgba(55, 65, 81, 0.3)',
            paddingTop: '0.75rem',
            marginTop: '0.75rem'
          }}>
            <span>≈ Équivalent EUR</span>
            <span>€{(totalPortfolioValue * 0.92).toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Statistiques Portfolio */}
      {safePortfolio.holdings && safePortfolio.holdings.length > 0 && (
        <div className="market-summary">
          <h4>Statistiques Portfolio</h4>
          <div className="summary-stats">
            <div className="stat">
              <span className="stat-label">% Crypto</span>
              <span className="stat-value">{portfolioStats.cryptoPercentage.toFixed(1)}%</span>
            </div>
            <div className="stat">
              <span className="stat-label">% Cash</span>
              <span className="stat-value">{portfolioStats.cashPercentage.toFixed(1)}%</span>
            </div>
            <div className="stat">
              <span className="stat-label">Positions</span>
              <span className="stat-value">{safePortfolio.holdings.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Diversification</span>
              <span className="stat-value">
                {safePortfolio.holdings.length >= 5 ? '🌟 EXCELLENTE' : 
                 safePortfolio.holdings.length >= 3 ? '👍 BONNE' : 
                 safePortfolio.holdings.length >= 2 ? '⚠️ MOYENNE' : '🚨 FAIBLE'}
              </span>
            </div>
            {portfolioStats.bestPerformer && (
              <div className="stat">
                <span className="stat-label">Top Performer</span>
                <span className="stat-value" style={{ color: '#34D399' }}>
                  {getCryptoIcon(portfolioStats.bestPerformer.crypto_id)} +{portfolioStats.bestPerformer.profitLossPercentage.toFixed(1)}%
                </span>
              </div>
            )}
            {portfolioStats.worstPerformer && (
              <div className="stat">
                <span className="stat-label">Pire Performance</span>
                <span className="stat-value" style={{ color: '#F87171' }}>
                  {getCryptoIcon(portfolioStats.worstPerformer.crypto_id)} {portfolioStats.worstPerformer.profitLossPercentage.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="holdings-list">
        {safePortfolio.holdings && safePortfolio.holdings.length > 0 ? (
          safePortfolio.holdings.map((holding, index) => {
            if (!holding || !holding.crypto_id) return null;
            
            const currentPrice = getPriceValue(safePrices[holding.crypto_id], currency);
            const quantity = Number(holding.quantity) || 0;
            const avgBuyPrice = convertValue(Number(holding.avg_buy_price) || 0);
            const currentValue = quantity * currentPrice;
            const costBasis = quantity * avgBuyPrice;
            const profitLoss = currentValue - costBasis;
            const profitLossPercentage = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;
            const isProfit = profitLoss >= 0;
            const portfolioWeight = totalCryptoValue > 0 ? (currentValue / totalCryptoValue) * 100 : 0;

            return (
              <div key={holding.crypto_id || index} className="holding-card">
                <div className="holding-header">
                  <div className="crypto-info">
                    <div 
                      className="crypto-icon"
                      style={{
                        background: getCryptoColor(holding.crypto_id),
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        color: '#0B0B0F',
                        marginRight: '1rem',
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                      }}
                    >
                      {getCryptoIcon(holding.crypto_id)}
                    </div>
                    <div>
                      <span className="crypto-name">
                        {safeCryptoNames[holding.crypto_id] || holding.crypto_id || 'Crypto Inconnue'}
                      </span>
                      <div style={{ 
                        fontSize: '0.875rem', 
                        color: '#9CA3AF',
                        marginTop: '0.25rem'
                      }}>
                        {portfolioWeight.toFixed(1)}% du portfolio crypto
                      </div>
                    </div>
                  </div>
                  <button
                    className="sell-btn"
                    onClick={() => handleSellClick(holding)}
                  >
                    💰 Vendre
                  </button>
                </div>

                <div className="holding-details">
                  <div className="detail-row">
                    <span>📊 Quantité</span>
                    <span>{quantity.toFixed(8)}</span>
                  </div>
                  <div className="detail-row">
                    <span>💵 Prix d'achat</span>
                    <span>{formatPrice(avgBuyPrice, currency)}</span>
                  </div>
                  <div className="detail-row">
                    <span>📈 Prix actuel</span>
                    <span>{formatPrice(currentPrice, currency)}</span>
                  </div>
                  <div className="detail-row">
                    <span>💰 Valeur actuelle</span>
                    <span>{formatPrice(currentValue, currency)}</span>
                  </div>
                  <div className="detail-row">
                    <span>📊 Coût d'acquisition</span>
                    <span>{formatPrice(costBasis, currency)}</span>
                  </div>
                  <div className={`detail-row profit-loss ${isProfit ? 'profit' : 'loss'}`}>
                    <span>🎯 P&L</span>
                    <span>
                      {isProfit ? '+' : ''}{formatPrice(profitLoss, currency)}
                      <br />
                      <small style={{ fontSize: '0.75rem' }}>
                        ({isProfit ? '+' : ''}{profitLossPercentage.toFixed(2)}%)
                      </small>
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-holdings">
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📭</div>
            <p>Votre portefeuille est vide</p>
            <p>Commencez par acheter des cryptomonnaies !</p>
            <div style={{ 
              marginTop: '2rem', 
              padding: '1rem', 
              background: 'rgba(0, 212, 170, 0.1)', 
              borderRadius: '12px',
              border: '1px solid rgba(0, 212, 170, 0.3)',
              textAlign: 'left'
            }}>
              <h4 style={{ color: '#00D4AA', marginBottom: '0.5rem' }}>💡 Conseils pour débuter :</h4>
              <ul style={{ color: '#9CA3AF', fontSize: '0.875rem', lineHeight: '1.6' }}>
                <li>• Commencez avec des montants modestes</li>
                <li>• Diversifiez vos investissements</li>
                <li>• Étudiez les projets avant d'investir</li>
                <li>• Ne jamais investir plus que ce que vous pouvez perdre</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Modal de vente amélioré */}
      {showSellModal && selectedHolding && (
        <div className="modal-overlay" onClick={() => setShowSellModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>
                {getCryptoIcon(selectedHolding.crypto_id)} Vendre {safeCryptoNames[selectedHolding.crypto_id] || selectedHolding.crypto_id}
              </h4>
              <button 
                className="close-btn"
                onClick={() => setShowSellModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-content">
              <div className="holding-info" style={{
                background: 'rgba(15, 15, 26, 0.8)',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid rgba(55, 65, 81, 0.3)',
                marginBottom: '2rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div 
                    style={{
                      background: getCryptoColor(selectedHolding.crypto_id),
                      width: '3rem',
                      height: '3rem',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      color: '#0B0B0F'
                    }}
                  >
                    {getCryptoIcon(selectedHolding.crypto_id)}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, color: '#FFFFFF' }}>
                      {safeCryptoNames[selectedHolding.crypto_id] || selectedHolding.crypto_id}
                    </h3>
                    <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.875rem' }}>
                      Position actuelle ({currency.toUpperCase()})
                    </p>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <p style={{ margin: '0.5rem 0', fontSize: '0.875rem', color: '#9CA3AF' }}>
                      Quantité détenue:
                    </p>
                    <p style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontWeight: '600' }}>
                      {(Number(selectedHolding.quantity) || 0).toFixed(8)}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0.5rem 0', fontSize: '0.875rem', color: '#9CA3AF' }}>
                      Prix actuel:
                    </p>
                    <p style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontWeight: '600', color: '#00D4AA' }}>
                      {formatPrice(getPriceValue(safePrices[selectedHolding.crypto_id], currency), currency)}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0.5rem 0', fontSize: '0.875rem', color: '#9CA3AF' }}>
                      Valeur totale:
                    </p>
                    <p style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontWeight: '600' }}>
                      {formatPrice(
                        (Number(selectedHolding.quantity) || 0) * getPriceValue(safePrices[selectedHolding.crypto_id], currency),
                        currency
                      )}
                    </p>
                  </div>
                  <div>
                    <p style={{ margin: '0.5rem 0', fontSize: '0.875rem', color: '#9CA3AF' }}>
                      Prix d'achat moyen:
                    </p>
                    <p style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontWeight: '600' }}>
                      {formatPrice(convertValue(Number(selectedHolding.avg_buy_price) || 0), currency)}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  color: '#9CA3AF',
                  fontWeight: '500',
                  fontSize: '0.875rem'
                }}>
                  Quantité à vendre:
                </label>
                <input
                  type="number"
                  value={sellQuantity}
                  onChange={(e) => setSellQuantity(e.target.value)}
                  placeholder="0.001"
                  step="0.00001"
                  max={selectedHolding.quantity || 0}
                  min="0"
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'rgba(15, 15, 26, 0.8)',
                    border: '1px solid rgba(55, 65, 81, 0.5)',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    fontFamily: 'JetBrains Mono, monospace'
                  }}
                />
              </div>

              {sellQuantity && (
                <div style={{
                  background: 'rgba(0, 212, 170, 0.1)',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 212, 170, 0.3)',
                  marginBottom: '1.5rem'
                }}>
                  <h4 style={{ color: '#00D4AA', marginBottom: '1rem', fontSize: '1rem' }}>
                    💰 Aperçu de la vente ({currency.toUpperCase()})
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: '#9CA3AF' }}>
                        Montant estimé:
                      </p>
                      <p style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontWeight: '700', color: '#00D4AA' }}>
                        {formatPrice(
                          parseFloat(sellQuantity || 0) * getPriceValue(safePrices[selectedHolding.crypto_id], currency),
                          currency
                        )}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: '#9CA3AF' }}>
                        Reste après vente:
                      </p>
                      <p style={{ margin: 0, fontFamily: 'JetBrains Mono, monospace', fontWeight: '600' }}>
                        {((Number(selectedHolding.quantity) || 0) - (parseFloat(sellQuantity) || 0)).toFixed(8)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '2rem' }}>
                <p style={{ 
                  marginBottom: '1rem', 
                  color: '#9CA3AF', 
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  Vente rapide:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  {[
                    { label: '25%', value: 0.25 },
                    { label: '50%', value: 0.5 },
                    { label: '75%', value: 0.75 },
                    { label: '100%', value: 1 }
                  ].map(({ label, value }) => (
                    <button
                      key={label}
                      onClick={() => setSellQuantity(((Number(selectedHolding.quantity) || 0) * value).toString())}
                      style={{
                        padding: '0.75rem',
                        border: '1px solid rgba(55, 65, 81, 0.5)',
                        background: 'rgba(26, 26, 46, 0.5)',
                        color: '#9CA3AF',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        fontSize: '0.875rem',
                        fontWeight: '600'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.borderColor = '#00D4AA';
                        e.target.style.color = '#FFFFFF';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.borderColor = 'rgba(55, 65, 81, 0.5)';
                        e.target.style.color = '#9CA3AF';
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => setShowSellModal(false)}
                style={{
                  flex: 1,
                  padding: '1rem',
                  border: '1px solid rgba(55, 65, 81, 0.5)',
                  background: 'transparent',
                  color: '#9CA3AF',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleSellConfirm}
                disabled={!sellQuantity || parseFloat(sellQuantity) <= 0}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: !sellQuantity || parseFloat(sellQuantity) <= 0 
                    ? 'rgba(239, 68, 68, 0.5)' 
                    : 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: !sellQuantity || parseFloat(sellQuantity) <= 0 ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '700',
                  transition: 'all 0.3s ease',
                  opacity: !sellQuantity || parseFloat(sellQuantity) <= 0 ? 0.5 : 1
                }}
              >
                🚀 Confirmer la vente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Portfolio;