import React, { useEffect, useRef, useState } from 'react';

const AnimatedBackground = () => {
  const backgroundRef = useRef(null);
  const [particles, setParticles] = useState([]);

  // Générer les particules
  useEffect(() => {
    const generateParticles = () => {
      const particleCount = window.innerWidth < 768 ? 15 : 30;
      const newParticles = [];
      
      for (let i = 0; i < particleCount; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          type: Math.floor(Math.random() * 4) + 1,
          delay: Math.random() * 20,
          duration: 15 + Math.random() * 10
        });
      }
      
      setParticles(newParticles);
    };

    generateParticles();
    
    const handleResize = () => {
      generateParticles();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Gestion du curseur personnalisé avec traînée fluide
  useEffect(() => {
    let mouseX = 0;
    let mouseY = 0;
    let isMouseActive = false;
    let isClickable = false;
    
    const cursor = document.querySelector('.custom-cursor');
    
    // Système de traînée fluide
    const trailPoints = [];
    const maxTrailLength = 15; // Nombre de points pour la ligne
    let trailContainer = null;
    let trailSvg = null;
    let trailPath = null;
    let trailPathSecondary = null;

    // Créer le container SVG pour la traînée
    const createTrailContainer = () => {
      // Supprimer l'ancien container s'il existe
      const existingContainer = document.querySelector('.cursor-trail-container');
      if (existingContainer) {
        document.body.removeChild(existingContainer);
      }

      trailContainer = document.createElement('div');
      trailContainer.className = 'cursor-trail-container';
      
      trailSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      trailSvg.setAttribute('class', 'cursor-trail-svg');
      
      // Créer les dégradés
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      
      // Dégradé principal
      const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      gradient.id = 'trailGradient';
      gradient.innerHTML = `
        <stop offset="0%" style="stop-color:rgba(0,212,170,0);stop-opacity:0" />
        <stop offset="20%" style="stop-color:rgba(0,212,170,0.3);stop-opacity:0.3" />
        <stop offset="60%" style="stop-color:rgba(0,228,187,0.8);stop-opacity:0.8" />
        <stop offset="100%" style="stop-color:rgba(0,245,204,1);stop-opacity:1" />
      `;
      
      // Dégradé secondaire
      const gradientSecondary = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      gradientSecondary.id = 'trailGradientSecondary';
      gradientSecondary.innerHTML = `
        <stop offset="0%" style="stop-color:rgba(0,212,170,0);stop-opacity:0" />
        <stop offset="30%" style="stop-color:rgba(0,245,204,0.4);stop-opacity:0.4" />
        <stop offset="100%" style="stop-color:rgba(52,211,153,0.7);stop-opacity:0.7" />
      `;
      
      // Dégradé interactif
      const gradientInteractive = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      gradientInteractive.id = 'trailGradientInteractive';
      gradientInteractive.innerHTML = `
        <stop offset="0%" style="stop-color:rgba(124,58,237,0);stop-opacity:0" />
        <stop offset="30%" style="stop-color:rgba(124,58,237,0.6);stop-opacity:0.6" />
        <stop offset="70%" style="stop-color:rgba(0,212,170,0.9);stop-opacity:0.9" />
        <stop offset="100%" style="stop-color:rgba(0,245,204,1);stop-opacity:1" />
      `;
      
      defs.appendChild(gradient);
      defs.appendChild(gradientSecondary);
      defs.appendChild(gradientInteractive);
      trailSvg.appendChild(defs);
      
      // Créer les chemins
      trailPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      trailPath.setAttribute('class', 'trail-line');
      
      trailPathSecondary = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      trailPathSecondary.setAttribute('class', 'trail-line-secondary');
      
      trailSvg.appendChild(trailPathSecondary);
      trailSvg.appendChild(trailPath);
      trailContainer.appendChild(trailSvg);
      document.body.appendChild(trailContainer);
    };

    // Mettre à jour la traînée
    const updateTrail = () => {
      if (trailPoints.length < 2) return;
      
      // Créer le chemin avec une courbe lisse
      let pathData = `M ${trailPoints[0].x} ${trailPoints[0].y}`;
      
      for (let i = 1; i < trailPoints.length; i++) {
        const point = trailPoints[i];
        const prevPoint = trailPoints[i - 1];
        
        if (i === 1) {
          pathData += ` L ${point.x} ${point.y}`;
        } else {
          // Utiliser des courbes de Bézier pour plus de fluidité
          const cp1x = prevPoint.x + (point.x - trailPoints[i - 2].x) * 0.2;
          const cp1y = prevPoint.y + (point.y - trailPoints[i - 2].y) * 0.2;
          const cp2x = point.x - (trailPoints[i - 1].x - prevPoint.x) * 0.2;
          const cp2y = point.y - (trailPoints[i - 1].y - prevPoint.y) * 0.2;
          
          pathData += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
        }
      }
      
      if (trailPath) {
        trailPath.setAttribute('d', pathData);
        trailPath.setAttribute('class', isClickable ? 'trail-line-interactive' : 'trail-line');
      }
      
      if (trailPathSecondary) {
        trailPathSecondary.setAttribute('d', pathData);
      }
    };

    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      isMouseActive = true;
      
      // Position immédiate du curseur
      if (cursor) {
        cursor.style.left = mouseX + 'px';
        cursor.style.top = mouseY + 'px';
      }
      
      // Ajouter le point à la traînée
      trailPoints.push({ x: mouseX, y: mouseY, time: Date.now() });
      
      // Limiter la longueur de la traînée
      if (trailPoints.length > maxTrailLength) {
        trailPoints.shift();
      }
      
      // Supprimer les points trop anciens (plus de 500ms)
      const currentTime = Date.now();
      while (trailPoints.length > 0 && currentTime - trailPoints[0].time > 500) {
        trailPoints.shift();
      }
      
      // Mettre à jour la traînée
      updateTrail();
      
      // Détecter le type d'élément sous le curseur
      const elementUnderCursor = document.elementFromPoint(mouseX, mouseY);
      const newIsClickable = elementUnderCursor && (
        elementUnderCursor.tagName === 'BUTTON' ||
        elementUnderCursor.tagName === 'A' ||
        elementUnderCursor.classList.contains('price-row') ||
        elementUnderCursor.classList.contains('crypto-card') ||
        elementUnderCursor.classList.contains('clickable') ||
        elementUnderCursor.classList.contains('timeframe-btn') ||
        elementUnderCursor.classList.contains('sell-btn') ||
        elementUnderCursor.classList.contains('invite-btn') ||
        elementUnderCursor.classList.contains('view-btn') ||
        elementUnderCursor.classList.contains('clear-search') ||
        elementUnderCursor.classList.contains('trade-type-btn') ||
        elementUnderCursor.closest('button') ||
        elementUnderCursor.closest('a') ||
        elementUnderCursor.closest('.price-row') ||
        elementUnderCursor.closest('.crypto-card') ||
        elementUnderCursor.closest('.clickable') ||
        getComputedStyle(elementUnderCursor).cursor === 'pointer'
      );
      
      const isInput = elementUnderCursor && (
        elementUnderCursor.tagName === 'INPUT' ||
        elementUnderCursor.tagName === 'TEXTAREA' ||
        elementUnderCursor.tagName === 'SELECT' ||
        elementUnderCursor.contentEditable === 'true'
      );
      
      isClickable = newIsClickable;
      
      // Mettre à jour l'état du curseur
      if (cursor) {
        cursor.className = 'custom-cursor';
        if (isInput) {
          cursor.classList.add('text-mode');
        } else if (isClickable) {
          cursor.classList.add('active');
        }
      }
      
      // Ondulations occasionnelles
      if (Math.random() > 0.985) {
        createRipple(mouseX, mouseY);
      }
    };

    const handleMouseDown = (e) => {
      const clickX = e.clientX;
      const clickY = e.clientY;
      
      if (cursor) {
        cursor.classList.add('clicking');
      }
      createEnhancedClickEffect(clickX, clickY);
    };

    const handleMouseUp = () => {
      if (cursor) {
        cursor.classList.remove('clicking');
      }
    };

    const handleMouseEnter = () => {
      isMouseActive = true;
      if (cursor) {
        cursor.style.opacity = '1';
      }
      if (trailContainer) {
        trailContainer.style.opacity = '1';
      }
    };

    const handleMouseLeave = () => {
      isMouseActive = false;
      if (cursor) {
        cursor.style.opacity = '0';
      }
      // Garder la traînée visible mais la faire disparaître progressivement
      if (trailContainer) {
        trailContainer.style.transition = 'opacity 0.5s ease-out';
        trailContainer.style.opacity = '0';
      }
      // Effacer les points de traînée
      trailPoints.length = 0;
      if (trailPath) trailPath.setAttribute('d', '');
      if (trailPathSecondary) trailPathSecondary.setAttribute('d', '');
    };

    // Effet de clic amélioré
    const createEnhancedClickEffect = (x, y) => {
      const clickCircle = document.createElement('div');
      clickCircle.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 0;
        height: 0;
        border: 3px solid rgba(0, 212, 170, 0.9);
        border-radius: 50%;
        pointer-events: none;
        z-index: 99997;
        transform: translate(-50%, -50%);
        box-shadow: 
          0 0 15px rgba(0, 212, 170, 0.8),
          0 0 30px rgba(0, 228, 187, 0.5);
      `;
      
      document.body.appendChild(clickCircle);
      
      clickCircle.animate([
        { 
          width: '0px', 
          height: '0px', 
          opacity: 1,
          borderColor: 'rgba(0, 212, 170, 0.9)'
        },
        { 
          width: '60px', 
          height: '60px', 
          opacity: 0,
          borderColor: 'rgba(0, 245, 204, 0.5)'
        }
      ], {
        duration: 600,
        easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      });
      
      // Particules d'explosion
      const colors = [
        'rgba(0, 212, 170, 0.9)',
        'rgba(0, 228, 187, 0.8)', 
        'rgba(0, 245, 204, 0.7)',
        'rgba(52, 211, 153, 0.6)'
      ];
      
      for (let i = 0; i < 6; i++) {
        const particle = document.createElement('div');
        const angle = (i / 6) * Math.PI * 2;
        const distance = 35 + Math.random() * 15;
        const endX = Math.cos(angle) * distance;
        const endY = Math.sin(angle) * distance;
        const color = colors[i % colors.length];
        
        particle.style.cssText = `
          position: fixed;
          left: ${x}px;
          top: ${y}px;
          width: 4px;
          height: 4px;
          background: ${color};
          border-radius: 50%;
          pointer-events: none;
          z-index: 99997;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 8px ${color};
        `;
        
        document.body.appendChild(particle);
        
        particle.animate([
          { 
            transform: 'translate(-50%, -50%) scale(1)', 
            opacity: 1 
          },
          { 
            transform: `translate(calc(-50% + ${endX}px), calc(-50% + ${endY}px)) scale(0)`, 
            opacity: 0 
          }
        ], {
          duration: 600,
          easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        });
        
        setTimeout(() => {
          if (document.body.contains(particle)) {
            document.body.removeChild(particle);
          }
        }, 600);
      }
      
      setTimeout(() => {
        if (document.body.contains(clickCircle)) {
          document.body.removeChild(clickCircle);
        }
      }, 600);
    };

    // Ondulations
    const createRipple = (x, y) => {
      const ripple = document.createElement('div');
      ripple.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 8px;
        height: 8px;
        background: radial-gradient(circle, 
          rgba(0, 212, 170, 0.6) 0%, 
          rgba(0, 228, 187, 0.4) 40%, 
          transparent 70%
        );
        border-radius: 50%;
        pointer-events: none;
        z-index: 99996;
        transform: translate(-50%, -50%);
      `;
      
      if (backgroundRef.current) {
        backgroundRef.current.appendChild(ripple);
        
        ripple.animate([
          { 
            transform: 'translate(-50%, -50%) scale(0)', 
            opacity: 1 
          },
          { 
            transform: 'translate(-50%, -50%) scale(6)', 
            opacity: 0 
          }
        ], {
          duration: 1000,
          easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        });
        
        setTimeout(() => {
          if (backgroundRef.current && backgroundRef.current.contains(ripple)) {
            backgroundRef.current.removeChild(ripple);
          }
        }, 1000);
      }
    };

    // Initialisation
    createTrailContainer();
    
    // Position initiale du curseur
    if (cursor) {
      cursor.style.left = '0px';
      cursor.style.top = '0px';
      cursor.style.opacity = '0';
    }

    // Event listeners
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      
      // Nettoyer le container de traînée
      const existingContainer = document.querySelector('.cursor-trail-container');
      if (existingContainer) {
        document.body.removeChild(existingContainer);
      }
    };
  }, []);

  // Générer les lignes de connexion
  const generateConnectionLines = () => {
    const lines = [];
    for (let i = 0; i < 3; i++) {
      lines.push(
        <div
          key={`line-${i}`}
          className="connection-line"
          style={{
            top: `${20 + i * 30}%`,
            animationDelay: `${i * 2}s`,
            width: '200px'
          }}
        />
      );
    }
    return lines;
  };

  return (
    <>
      {/* Curseur personnalisé */}
      <div className="custom-cursor" />

      {/* Container principal de l'arrière-plan */}
      <div 
        ref={backgroundRef}
        className="animated-background"
      >
        {/* Dégradé mesh animé */}
        <div className="mesh-gradient" />
        
        {/* Couche de parallaxe */}
        <div className="parallax-layer" />

        {/* Orbes lumineux */}
        <div className="glowing-orbs">
          <div className="orb orb-1" />
          <div className="orb orb-2" />
          <div className="orb orb-3" />
        </div>

        {/* Particules flottantes */}
        <div className="floating-particles">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className={`particle particle-${particle.type}`}
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                animationDelay: `${particle.delay}s`,
                animationDuration: `${particle.duration}s`
              }}
            />
          ))}
        </div>

        {/* Lignes de connexion */}
        <div className="connection-lines">
          {generateConnectionLines()}
        </div>
      </div>

      {/* Zone interactive invisible */}
      <div className="interactive-background" />
    </>
  );
};

export default AnimatedBackground;