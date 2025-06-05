// frontend/src/components/CurrencySwitch.js
import React from 'react';

const CurrencySwitch = ({ currency, onCurrencyChange }) => {
  const toggleCurrency = () => {
    const newCurrency = currency === 'usd' ? 'eur' : 'usd';
    onCurrencyChange(newCurrency);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem 1rem',
      background: 'rgba(26, 26, 46, 0.6)',
      backdropFilter: 'blur(20px)',
      borderRadius: '12px',
      border: '1px solid rgba(55, 65, 81, 0.3)',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    }}
    onClick={toggleCurrency}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = 'rgba(0, 212, 170, 0.5)';
      e.currentTarget.style.transform = 'translateY(-1px)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 212, 170, 0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'rgba(55, 65, 81, 0.3)';
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
    title={`Basculer vers ${currency === 'usd' ? 'EUR' : 'USD'}`}
    >
      {/* Icône de devise */}
      <div style={{
        width: '2rem',
        height: '2rem',
        background: currency === 'usd' 
          ? 'linear-gradient(135deg, #10B981 0%, #14C085 100%)'
          : 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.875rem',
        fontWeight: 'bold',
        color: 'white',
        transition: 'all 0.3s ease',
        boxShadow: currency === 'usd' 
          ? '0 2px 8px rgba(16, 185, 129, 0.3)'
          : '0 2px 8px rgba(59, 130, 246, 0.3)'
      }}>
        {currency === 'usd' ? '$' : '€'}
      </div>

      {/* Texte de la devise */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start'
      }}>
        <span style={{
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#FFFFFF',
          lineHeight: '1.2'
        }}>
          {currency === 'usd' ? 'Dollar US' : 'Euro'}
        </span>
        <span style={{
          fontSize: '0.75rem',
          color: '#9CA3AF',
          fontFamily: 'JetBrains Mono, monospace'
        }}>
          {currency.toUpperCase()}
        </span>
      </div>

      {/* Indicateur de basculement */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.25rem',
        marginLeft: 'auto'
      }}>
        <div style={{
          width: '4px',
          height: '4px',
          background: currency === 'usd' ? '#10B981' : '#3B82F6',
          borderRadius: '50%',
          transition: 'all 0.3s ease'
        }} />
        <span style={{
          fontSize: '1rem',
          color: '#9CA3AF',
          transform: 'rotate(90deg)',
          transition: 'all 0.3s ease'
        }}>
          ⇄
        </span>
      </div>
    </div>
  );
};

export default CurrencySwitch;