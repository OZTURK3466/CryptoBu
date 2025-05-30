import React, { useState } from 'react';
import authService from '../services/authService';

const Login = ({ onLogin, onSwitchToRegister }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Effacer l'erreur quand l'utilisateur tape
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await authService.login(formData.email, formData.password);
      onLogin(result.user);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'var(--background-dark)',
      padding: '2rem'
    }}>
      <div style={{
        background: 'rgba(26, 26, 46, 0.9)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        border: '1px solid rgba(55, 65, 81, 0.3)',
        padding: '3rem',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            background: 'linear-gradient(135deg, #00D4AA, #7C3AED)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontSize: '2.5rem',
            fontWeight: '800',
            marginBottom: '0.5rem'
          }}>
            🚀 Crypto Trading
          </h1>
          <h2 style={{
            color: '#FFFFFF',
            fontSize: '1.5rem',
            fontWeight: '600',
            marginBottom: '0.5rem'
          }}>
            Connexion
          </h2>
          <p style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>
            Connectez-vous pour accéder à votre portfolio
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem',
            color: '#F87171',
            textAlign: 'center',
            fontSize: '0.875rem'
          }}>
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.75rem',
              color: '#9CA3AF',
              fontWeight: '500',
              fontSize: '0.875rem'
            }}>
              📧 Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '1rem',
                background: 'rgba(15, 15, 26, 0.8)',
                border: '1px solid rgba(55, 65, 81, 0.5)',
                borderRadius: '12px',
                color: '#FFFFFF',
                fontSize: '1rem',
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
              placeholder="votre@email.com"
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.75rem',
              color: '#9CA3AF',
              fontWeight: '500',
              fontSize: '0.875rem'
            }}>
              🔒 Mot de passe
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '1rem',
                background: 'rgba(15, 15, 26, 0.8)',
                border: '1px solid rgba(55, 65, 81, 0.5)',
                borderRadius: '12px',
                color: '#FFFFFF',
                fontSize: '1rem',
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
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '1.25rem',
              background: loading 
                ? 'rgba(55, 65, 81, 0.3)' 
                : 'linear-gradient(135deg, #00D4AA 0%, #00E4BB 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.125rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              marginBottom: '1.5rem',
              opacity: loading ? 0.5 : 1,
              boxShadow: loading ? 'none' : '0 4px 12px rgba(0, 212, 170, 0.3)'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 16px rgba(0, 212, 170, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 212, 170, 0.3)';
              }
            }}
          >
            {loading ? '🔄 Connexion...' : '🚀 Se connecter'}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#9CA3AF', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Pas encore de compte ?
          </p>
          <button
            onClick={onSwitchToRegister}
            style={{
              background: 'transparent',
              border: '1px solid rgba(124, 58, 237, 0.5)',
              color: '#A855F7',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#A855F7';
              e.target.style.background = 'rgba(124, 58, 237, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = 'rgba(124, 58, 237, 0.5)';
              e.target.style.background = 'transparent';
            }}
          >
            📝 Créer un compte
          </button>
        </div>

        {/* Comptes de test */}
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          background: 'rgba(124, 58, 237, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(124, 58, 237, 0.3)'
        }}>
          <h4 style={{ color: '#A855F7', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            🧪 Comptes de test
          </h4>
          <p style={{ color: '#9CA3AF', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
            Email: test@example.com<br/>
            Mot de passe: password123
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;