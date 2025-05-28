import React, { useState } from 'react';

const TradingPanel = ({ selectedCrypto, currentPrice, onTrade, userBalance }) => {
  const [tradeType, setTradeType] = useState('buy');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTrade = async () => {
    if (!amount || amount <= 0) {
      alert('Veuillez entrer un montant valide');
      return;
    }

    if (!currentPrice) {
      alert('Prix non disponible, veuillez patienter');
      return;
    }

    if (tradeType === 'buy' && parseFloat(amount) > userBalance) {
      alert('Solde insuffisant');
      return;
    }

    setLoading(true);
    try {
      await onTrade(tradeType, selectedCrypto, parseFloat(amount));
      setAmount('');
    } catch (error) {
      console.error('Erreur lors du trade:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateQuantity = () => {
    if (!amount || !currentPrice) return 0;
    return tradeType === 'buy' ? parseFloat(amount) / currentPrice : parseFloat(amount);
  };

  const calculateTotal = () => {
    if (!amount || !currentPrice) return 0;
    return tradeType === 'buy' ? parseFloat(amount) : parseFloat(amount) * currentPrice;
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

  const cryptoName = selectedCrypto.charAt(0).toUpperCase() + selectedCrypto.slice(1);

  return (
    <div className="trading-panel">
      <h3>Panel de Trading</h3>
      
      <div className="crypto-info">
        <div className="selected-crypto">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div 
              style={{
                background: getCryptoColor(selectedCrypto),
                width: '3rem',
                height: '3rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#0B0B0F',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
              }}
            >
              {getCryptoIcon(selectedCrypto)}
            </div>
            <div>
              <span className="crypto-name">{cryptoName}</span>
              <div style={{ fontSize: '0.875rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                {selectedCrypto.toUpperCase()}
              </div>
            </div>
          </div>
          {currentPrice && (
            <div className="crypto-price">
              ${currentPrice.toFixed(2)}
            </div>
          )}
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '0.75rem', 
        marginBottom: '2rem' 
      }}>
        <button
          className={`trade-type-btn ${tradeType === 'buy' ? 'active buy' : ''}`}
          onClick={() => setTradeType('buy')}
          style={{
            background: tradeType === 'buy' 
              ? 'linear-gradient(135deg, #10B981 0%, #14C085 100%)' 
              : 'rgba(26, 26, 46, 0.5)',
            border: tradeType === 'buy' 
              ? '1px solid #10B981' 
              : '1px solid rgba(55, 65, 81, 0.5)',
            color: tradeType === 'buy' ? 'white' : '#9CA3AF',
            padding: '1rem',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            fontSize: '1rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: tradeType === 'buy' ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none'
          }}
          onMouseEnter={(e) => {
            if (tradeType !== 'buy') {
              e.target.style.borderColor = '#10B981';
              e.target.style.color = '#FFFFFF';
              e.target.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (tradeType !== 'buy') {
              e.target.style.borderColor = 'rgba(55, 65, 81, 0.5)';
              e.target.style.color = '#9CA3AF';
              e.target.style.transform = 'translateY(0)';
            }
          }}
        >
          🚀 Acheter
        </button>
        <button
          className={`trade-type-btn ${tradeType === 'sell' ? 'active sell' : ''}`}
          onClick={() => setTradeType('sell')}
          style={{
            background: tradeType === 'sell' 
              ? 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)' 
              : 'rgba(26, 26, 46, 0.5)',
            border: tradeType === 'sell' 
              ? '1px solid #EF4444' 
              : '1px solid rgba(55, 65, 81, 0.5)',
            color: tradeType === 'sell' ? 'white' : '#9CA3AF',
            padding: '1rem',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            fontSize: '1rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: tradeType === 'sell' ? '0 4px 12px rgba(239, 68, 68, 0.3)' : 'none'
          }}
          onMouseEnter={(e) => {
            if (tradeType !== 'sell') {
              e.target.style.borderColor = '#EF4444';
              e.target.style.color = '#FFFFFF';
              e.target.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (tradeType !== 'sell') {
              e.target.style.borderColor = 'rgba(55, 65, 81, 0.5)';
              e.target.style.color = '#9CA3AF';
              e.target.style.transform = 'translateY(0)';
            }
          }}
        >
          💰 Vendre
        </button>
      </div>

      <div className="trade-inputs">
        <div className="input-group">
          <label style={{
            display: 'block',
            marginBottom: '0.75rem',
            color: '#9CA3AF',
            fontWeight: '500',
            fontSize: '0.875rem'
          }}>
            {tradeType === 'buy' ? '💵 Montant (USD)' : '📊 Quantité'}
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={tradeType === 'buy' ? '100.00' : '0.001'}
            step={tradeType === 'buy' ? '0.01' : '0.00001'}
            min="0"
            style={{
              width: '100%',
              padding: '1rem',
              background: 'rgba(15, 15, 26, 0.8)',
              border: '1px solid rgba(55, 65, 81, 0.5)',
              borderRadius: '12px',
              color: '#FFFFFF',
              fontSize: '1rem',
              fontFamily: 'JetBrains Mono, monospace',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#00D4AA';
              e.target.style.boxShadow = '0 0 0 3px rgba(0, 212, 170, 0.15)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(55, 65, 81, 0.5)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {amount && currentPrice && (
          <div style={{
            background: 'rgba(0, 212, 170, 0.1)',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid rgba(0, 212, 170, 0.3)',
            margin: '1rem 0'
          }}>
            <h4 style={{ 
              color: '#00D4AA', 
              marginBottom: '1rem', 
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              📋 Aperçu de la transaction
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>
                  Quantité:
                </div>
                <div style={{ 
                  fontFamily: 'JetBrains Mono, monospace', 
                  fontWeight: '600',
                  color: '#FFFFFF'
                }}>
                  {calculateQuantity().toFixed(8)} {cryptoName}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>
                  Total:
                </div>
                <div style={{ 
                  fontFamily: 'JetBrains Mono, monospace', 
                  fontWeight: '700',
                  color: '#00D4AA'
                }}>
                  ${calculateTotal().toFixed(2)}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.875rem', color: '#9CA3AF', marginBottom: '0.25rem' }}>
                  Prix unitaire:
                </div>
                <div style={{ 
                  fontFamily: 'JetBrains Mono, monospace', 
                  fontWeight: '600',
                  color: '#FFFFFF'
                }}>
                  ${currentPrice.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: '1.5rem' }}>
          <span style={{ 
            display: 'block',
            marginBottom: '0.75rem',
            color: '#9CA3AF',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            ⚡ Montants rapides:
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
            {tradeType === 'buy' ? (
              <>
                <button 
                  onClick={() => setAmount('100')}
                  style={{
                    padding: '0.75rem 0.5rem',
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
                  $100
                </button>
                <button 
                  onClick={() => setAmount('500')}
                  style={{
                    padding: '0.75rem 0.5rem',
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
                  $500
                </button>
                <button 
                  onClick={() => setAmount('1000')}
                  style={{
                    padding: '0.75rem 0.5rem',
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
                  $1000
                </button>
                <button 
                  onClick={() => setAmount(userBalance.toString())}
                  style={{
                    padding: '0.75rem 0.5rem',
                    border: '1px solid rgba(124, 58, 237, 0.5)',
                    background: 'rgba(124, 58, 237, 0.2)',
                    color: '#A855F7',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontSize: '0.875rem',
                    fontWeight: '700'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = '#A855F7';
                    e.target.style.color = '#FFFFFF';
                    e.target.style.background = 'rgba(124, 58, 237, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = 'rgba(124, 58, 237, 0.5)';
                    e.target.style.color = '#A855F7';
                    e.target.style.background = 'rgba(124, 58, 237, 0.2)';
                  }}
                >
                  MAX
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setAmount('0.001')}
                  style={{
                    padding: '0.75rem 0.5rem',
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
                  0.001
                </button>
                <button 
                  onClick={() => setAmount('0.01')}
                  style={{
                    padding: '0.75rem 0.5rem',
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
                  0.01
                </button>
                <button 
                  onClick={() => setAmount('0.1')}
                  style={{
                    padding: '0.75rem 0.5rem',
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
                  0.1
                </button>
                <button 
                  onClick={() => setAmount('1.0')}
                  style={{
                    padding: '0.75rem 0.5rem',
                    border: '1px solid rgba(124, 58, 237, 0.5)',
                    background: 'rgba(124, 58, 237, 0.2)',
                    color: '#A855F7',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    fontSize: '0.875rem',
                    fontWeight: '700'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = '#A855F7';
                    e.target.style.color = '#FFFFFF';
                    e.target.style.background = 'rgba(124, 58, 237, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = 'rgba(124, 58, 237, 0.5)';
                    e.target.style.color = '#A855F7';
                    e.target.style.background = 'rgba(124, 58, 237, 0.2)';
                  }}
                >
                  1.0
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={handleTrade}
        disabled={loading || !amount || !currentPrice}
        style={{
          width: '100%',
          padding: '1.25rem',
          background: loading || !amount || !currentPrice 
            ? 'rgba(55, 65, 81, 0.3)' 
            : tradeType === 'buy' 
              ? 'linear-gradient(135deg, #10B981 0%, #14C085 100%)'
              : 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          fontSize: '1.125rem',
          fontWeight: '700',
          cursor: loading || !amount || !currentPrice ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          marginTop: '2rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          opacity: loading || !amount || !currentPrice ? 0.5 : 1,
          boxShadow: loading || !amount || !currentPrice ? 'none' : '0 4px 12px rgba(0, 0, 0, 0.2)'
        }}
        onMouseEnter={(e) => {
          if (!loading && amount && currentPrice) {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.3)';
          }
        }}
        onMouseLeave={(e) => {
          if (!loading && amount && currentPrice) {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
          }
        }}
      >
        {loading ? (
          <>
            <span style={{ 
              animation: 'spin 1s linear infinite',
              display: 'inline-block'
            }}>⏳</span>
            Transaction en cours...
          </>
        ) : (
          <>
            {tradeType === 'buy' ? '🚀 Acheter' : '💰 Vendre'} {cryptoName}
          </>
        )}
      </button>

      <div style={{
        padding: '1.5rem',
        background: 'rgba(15, 15, 26, 0.8)',
        borderRadius: '12px',
        border: '1px solid rgba(55, 65, 81, 0.3)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ color: '#9CA3AF', fontWeight: '500' }}>
            💳 Solde disponible:
          </span>
          <span style={{
            color: '#00D4AA',
            fontWeight: '700',
            fontSize: '1.125rem',
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            ${userBalance.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TradingPanel;