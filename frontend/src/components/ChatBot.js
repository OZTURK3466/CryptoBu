import React, { useState, useRef, useEffect } from 'react';

const ChatBot = ({ user, selectedCrypto, currentPrice, portfolio, prices, cryptoNames }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Configuration de l'API - à remplacer par tes vraies valeurs
  const API_CONFIG = {
    endpoint: process.env.REACT_APP_AIGENT_API_URL || 'https://api.aigent-hub.com/v1/chat',
    apiKey: process.env.REACT_APP_AIGENT_API_KEY || 'your-api-key-here',
    agentId: process.env.REACT_APP_AGENT_ID || 'your-agent-id-here'
  };

  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Message de bienvenue au premier clic
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage = process.env.REACT_APP_CHATBOT_WELCOME_MESSAGE || 
        `👋 Salut ${user?.username || ''}! Je suis ton assistant crypto trading. Comment puis-je t'aider aujourd'hui ?`;
      
      setMessages([{
        id: 1,
        text: welcomeMessage,
        sender: 'bot',
        timestamp: new Date()
      }]);
    }
  }, [isOpen, messages.length, user?.username]);

  // Envoyer un message à l'API
  const sendMessage = async (message) => {
    try {
      setIsLoading(true);
      setIsTyping(true);

      const response = await fetch(API_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          agent_id: API_CONFIG.agentId,
          message: message,
          context: {
            user_id: user?.id,
            username: user?.username,
            user_balance: user?.balance || 0,
            selected_crypto: selectedCrypto,
            current_price: currentPrice,
            portfolio_value: portfolio?.total_crypto_value || 0,
            cash_balance: portfolio?.cash_balance || 0,
            holdings_count: portfolio?.holdings?.length || 0,
            top_holding: portfolio?.holdings?.[0]?.crypto_id || null,
            timestamp: new Date().toISOString(),
            available_cryptos: Object.keys(cryptoNames || {}),
            current_prices: prices ? Object.fromEntries(
              Object.entries(prices).map(([key, value]) => [key, value.usd])
            ) : {}
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status}`);
      }

      const data = await response.json();
      
      // Délai d'attente pour simuler la frappe
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: data.response || data.message || "Désolé, je n'ai pas pu traiter votre demande.",
          sender: 'bot',
          timestamp: new Date()
        }]);
        setIsTyping(false);
      }, 1000);

    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: "😅 Désolé, j'ai des problèmes de connexion. Peux-tu réessayer ?",
          sender: 'bot',
          timestamp: new Date()
        }]);
        setIsTyping(false);
      }, 500);
    } finally {
      setIsLoading(false);
    }
  };

  // Supprimer les anciennes fonctions et les remplacer par des suggestions dynamiques
  const getSuggestions = () => {
    const suggestions = [
      `💰 Mon solde (${user?.balance ? `${parseFloat(user.balance).toFixed(2)}` : 'N/A'})`,
      `📊 Analyse ${cryptoNames?.[selectedCrypto] || selectedCrypto}`,
      `📈 Tendances du marché`,
      `💡 Conseil d'investissement`
    ];
    
    if (portfolio?.holdings?.length > 0) {
      suggestions.push(`🏆 Mon portfolio (${portfolio.holdings.length} positions)`);
    }
    
    return suggestions;
  };

  // Gérer l'envoi du message
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    sendMessage(inputMessage);
    setInputMessage('');
  };

  // Gérer l'appui sur Entrée
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Bouton flottant du chatbot */}
      <div
        className={`chatbot-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          left: '2rem',
          width: '4rem',
          height: '4rem',
          background: 'linear-gradient(135deg, #00D4AA 0%, #00E4BB 100%)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 25px rgba(0, 212, 170, 0.4)',
          zIndex: 1000,
          transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          transform: isOpen ? 'scale(0.9) rotate(180deg)' : 'scale(1) rotate(0deg)',
          animation: 'pulse 2s infinite'
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.target.style.transform = 'scale(1.1)';
            e.target.style.boxShadow = '0 12px 30px rgba(0, 212, 170, 0.6)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 8px 25px rgba(0, 212, 170, 0.4)';
          }
        }}
      >
        <div
          style={{
            fontSize: '2rem',
            transition: 'all 0.3s ease',
            transform: isOpen ? 'rotate(-180deg)' : 'rotate(0deg)'
          }}
        >
          {isOpen ? '✕' : '🤖'}
        </div>
        
        {/* Indicateur de notification */}
        {!isOpen && (
          <div
            style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              width: '1rem',
              height: '1rem',
              background: 'linear-gradient(135deg, #EF4444, #F87171)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              color: 'white',
              animation: 'bounce 1s infinite'
            }}
          >
            💬
          </div>
        )}
      </div>

      {/* Fenêtre de chat */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '7rem',
            left: '2rem',
            width: '400px',
            height: '600px',
            background: 'rgba(26, 26, 46, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            border: '1px solid rgba(0, 212, 170, 0.3)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'slideInUp 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
          }}
        >
          {/* Header du chat */}
          <div
            style={{
              padding: '1.5rem',
              background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.2), rgba(124, 58, 237, 0.2))',
              borderBottom: '1px solid rgba(55, 65, 81, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <div
              style={{
                width: '3rem',
                height: '3rem',
                background: 'linear-gradient(135deg, #00D4AA, #7C3AED)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                animation: 'robotBlink 3s infinite'
              }}
            >
              🤖
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#FFFFFF', fontSize: '1.25rem', fontWeight: '700' }}>
                CryptoBot Assistant
              </h3>
              <p style={{ margin: 0, color: '#9CA3AF', fontSize: '0.875rem' }}>
                🟢 En ligne - Powered by AIgent Hub
              </p>
            </div>
          </div>

          {/* Zone des messages */}
          <div
            style={{
              flex: 1,
              padding: '1rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                  animation: 'messageSlide 0.3s ease-out'
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '1rem 1.25rem',
                    borderRadius: message.sender === 'user' ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                    background: message.sender === 'user'
                      ? 'linear-gradient(135deg, #00D4AA, #00E4BB)'
                      : 'rgba(15, 15, 26, 0.8)',
                    color: message.sender === 'user' ? '#0B0B0F' : '#FFFFFF',
                    border: message.sender === 'bot' ? '1px solid rgba(55, 65, 81, 0.3)' : 'none',
                    fontSize: '0.95rem',
                    lineHeight: '1.5',
                    boxShadow: message.sender === 'user'
                      ? '0 4px 12px rgba(0, 212, 170, 0.3)'
                      : '0 4px 12px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  {message.text}
                  <div
                    style={{
                      fontSize: '0.75rem',
                      marginTop: '0.5rem',
                      opacity: 0.7,
                      color: message.sender === 'user' ? '#0B0B0F' : '#9CA3AF'
                    }}
                  >
                    {message.timestamp.toLocaleTimeString('fr-FR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            ))}

            {/* Indicateur de frappe */}
            {isTyping && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    padding: '1rem 1.25rem',
                    borderRadius: '20px 20px 20px 5px',
                    background: 'rgba(15, 15, 26, 0.8)',
                    border: '1px solid rgba(55, 65, 81, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>
                    CryptoBot écrit...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Zone de saisie */}
          <div
            style={{
              padding: '1rem',
              borderTop: '1px solid rgba(55, 65, 81, 0.3)',
              background: 'rgba(15, 15, 26, 0.5)'
            }}
          >
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Pose-moi une question sur le crypto trading..."
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '1rem',
                  background: 'rgba(26, 26, 46, 0.8)',
                  border: '1px solid rgba(55, 65, 81, 0.5)',
                  borderRadius: '15px',
                  color: '#FFFFFF',
                  fontSize: '0.95rem',
                  resize: 'none',
                  minHeight: '50px',
                  maxHeight: '120px',
                  fontFamily: 'inherit',
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
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                style={{
                  padding: '0.9rem',
                  background: !inputMessage.trim() || isLoading
                    ? 'rgba(55, 65, 81, 0.3)'
                    : 'linear-gradient(135deg, #00D4AA, #00E4BB)',
                  border: 'none',
                  borderRadius: '12px',
                  color: !inputMessage.trim() || isLoading ? '#9CA3AF' : '#0B0B0F',
                  cursor: !inputMessage.trim() || isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '1.25rem',
                  transition: 'all 0.3s ease',
                  minWidth: '50px',
                  minHeight: '50px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  if (inputMessage.trim() && !isLoading) {
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.boxShadow = '0 4px 12px rgba(0, 212, 170, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                {isLoading ? '⏳' : '🚀'}
              </button>
            </div>

            {/* Suggestions rapides */}
            <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {getSuggestions().slice(0, 4).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setInputMessage(suggestion.split(' ').slice(1).join(' '))}
                  style={{
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(0, 212, 170, 0.1)',
                    border: '1px solid rgba(0, 212, 170, 0.3)',
                    borderRadius: '20px',
                    color: '#00D4AA',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(0, 212, 170, 0.2)';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(0, 212, 170, 0.1)';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Styles CSS intégrés */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 8px 25px rgba(0, 212, 170, 0.4); }
          50% { box-shadow: 0 8px 25px rgba(0, 212, 170, 0.8); }
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
          60% { transform: translateY(-2px); }
        }

        @keyframes slideInUp {
          from {
            transform: translateY(100%) scale(0.8);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }

        @keyframes messageSlide {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes robotBlink {
          0%, 90%, 100% { transform: scale(1); }
          95% { transform: scale(1.1); }
        }

        .typing-indicator {
          display: flex;
          gap: 3px;
        }

        .typing-indicator span {
          width: 6px;
          height: 6px;
          background: #00D4AA;
          border-radius: 50%;
          animation: typing 1.4s infinite ease-in-out;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .chatbot-button {
            bottom: 1rem !important;
            left: 1rem !important;
            width: 3.5rem !important;
            height: 3.5rem !important;
          }
          
          [style*="width: 400px"] {
            width: calc(100vw - 2rem) !important;
            height: 500px !important;
            bottom: 6rem !important;
            left: 1rem !important;
          }
        }
      `}</style>
    </>
  );
};

export default ChatBot;