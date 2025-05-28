import React, { useState } from 'react';

const DiscordInvite = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  // URL d'invitation Discord (à remplacer par votre vraie URL)
  const DISCORD_INVITE_URL = "https://discord.com/oauth2/authorize?client_id=1377270467576074420&permissions=2147600384&integration_type=0&scope=bot+applications.commands";

  const handleInviteBot = () => {
    window.open(DISCORD_INVITE_URL, '_blank', 'width=500,height=700');
  };

  const features = [
    {
      icon: '📊',
      title: 'Prix en Temps Réel',
      description: 'Consultez les prix crypto instantanément avec /crypto bitcoin'
    },
    {
      icon: '📈',
      title: 'Portfolio Global',
      description: 'Vue d\'ensemble de toutes les cryptos avec /portfolio'
    },
    {
      icon: '📉',
      title: 'Graphiques',
      description: 'Génération de charts automatiques avec /chart'
    },
    {
      icon: '🔔',
      title: 'Alertes (Bientôt)',
      description: 'Notifications personnalisées pour vos cryptos favorites'
    }
  ];

  return (
    <div className="discord-invite-section">
      <div className="discord-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="discord-title">
          <div className="discord-logo">
            <svg width="24" height="24" viewBox="0 0 71 55" fill="none">
              <g clipPath="url(#clip0)">
                <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="#5865F2"/>
              </g>
            </svg>
          </div>
          <div className="discord-text">
            <h3>🤖 Bot Discord Crypto</h3>
            <p>Ajoutez notre bot à votre serveur Discord</p>
          </div>
        </div>
        <div className={`discord-arrow ${isExpanded ? 'expanded' : ''}`}>
          ⌄
        </div>
      </div>

      <div className={`discord-content ${isExpanded ? 'expanded' : ''}`}>
        <div className="discord-features">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <div className="feature-info">
                <h4>{feature.title}</h4>
                <p>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="discord-commands">
          <h4>📋 Commandes Disponibles</h4>
          <div className="commands-grid">
            <div className="command-item">
              <code>/crypto bitcoin</code>
              <span>Prix détaillé de Bitcoin</span>
            </div>
            <div className="command-item">
              <code>/portfolio</code>
              <span>Vue d'ensemble cryptos</span>
            </div>
            <div className="command-item">
              <code>/chart ethereum 7</code>
              <span>Graphique Ethereum 7 jours</span>
            </div>
            <div className="command-item">
              <code>/help</code>
              <span>Aide complète</span>
            </div>
          </div>
        </div>

        <div className="discord-actions">
          <button 
            className="invite-btn primary"
            onClick={handleInviteBot}
          >
            <span className="btn-icon">🚀</span>
            Ajouter à Discord
          </button>
          
          <div className="discord-stats">
            <div className="stat">
              <span className="stat-number">10+</span>
              <span className="stat-label">Cryptos suivies</span>
            </div>
            <div className="stat">
              <span className="stat-number">24/7</span>
              <span className="stat-label">Disponibilité</span>
            </div>
            <div className="stat">
              <span className="stat-number">⚡</span>
              <span className="stat-label">Temps réel</span>
            </div>
          </div>
        </div>

        <div className="discord-preview">
          <h4>💬 Aperçu Discord</h4>
          <div className="discord-mock">
            <div className="discord-message">
              <div className="discord-avatar">🤖</div>
              <div className="discord-msg-content">
                <div className="discord-username">CryptoBot</div>
                <div className="discord-embed">
                  <div className="embed-header">
                    <span className="embed-icon">₿</span>
                    <span className="embed-title">Bitcoin (BTC)</span>
                  </div>
                  <div className="embed-fields">
                    <div className="embed-field">
                      <span className="field-name">💰 Prix USD</span>
                      <span className="field-value">$43,250.00</span>
                    </div>
                    <div className="embed-field">
                      <span className="field-name">📈 Variation 24h</span>
                      <span className="field-value positive">+2.45%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscordInvite;