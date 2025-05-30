import React, { useState } from 'react';
import authService from '../services/authService';

const Register = ({ onRegister, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }
    if (formData.username.length < 3) {
      setError('Le nom d\'utilisateur doit contenir au moins 3 caractères');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const result = await authService.register(
        formData.username,
        formData.email,
        formData.password
      );
      onRegister(result.user);
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
            Inscription
          </h2>
          <p style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>
            Créez votre compte pour commencer à trader
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
              👤 Nom d'utilisateur
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
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
              placeholder="johndoe"
            />
          </div>

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
              placeholder="john@example.com"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
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
              placeholder="••••••••"
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
              🔐 Confirmer le mot de passe
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
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
                : 'linear-gradient(135deg, #7C3AED 0%, #9333EA 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.125rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              marginBottom: '1.5rem',
              opacity: loading ? 0.5 : 1,
              boxShadow: loading ? 'none' : '0 4px 12px rgba(124, 58, 237, 0.3)'
            }}
          >
            {loading ? '🔄 Création...' : '🎉 Créer mon compte'}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#9CA3AF', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Déjà un compte ?
          </p>
          <button
            onClick={onSwitchToLogin}
            style={{
              background: 'transparent',
              border: '1px solid rgba(0, 212, 170, 0.5)',
              color: '#00D4AA',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              transition: 'all 0.3s ease'
            }}
          >
            🔑 Se connecter
          </button>
        </div>

        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          background: 'rgba(0, 212, 170, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(0, 212, 170, 0.3)'
        }}>
          <h4 style={{ color: '#00D4AA', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            🎁 Bonus de bienvenue
          </h4>
          <p style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
            10 000$ virtuels offerts pour commencer à trader !
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
