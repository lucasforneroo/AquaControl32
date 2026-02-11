import React, { useEffect, useState } from 'react';
import AQ32Logo from '../../assets/AQ32Logo.png'; 
import './Intro.css';

const Intro = ({ onComplete }) => {
  const [phase, setPhase] = useState('flicker'); // flicker -> solid -> expand

  useEffect(() => {
    // Fase 1: Titilado (0-2s)
    const flickerTimer = setTimeout(() => {
      setPhase('solid');
    }, 2000);

    // Fase 2: Logo blanco sólido + fondo gris (2-2.5s)
    const solidTimer = setTimeout(() => {
      setPhase('expand');
    }, 2500);

    // Fase 3: Expansión de líneas tech (2.5-4s) -> terminar intro
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 4000);

    return () => {
      clearTimeout(flickerTimer);
      clearTimeout(solidTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div className={`intro-wrapper intro-phase-${phase}`}>
      {/* Logo central con efecto de titilado */}
      <div className="intro-logo-container">
        <img
          src={AQ32Logo}
          alt="AquaControl32"
          className="intro-logo-img"
        />
      </div>

      {/* Líneas tech azules que se expanden desde el centro */}
      <div className="tech-lines-container">
        {/* Líneas horizontales desde el centro hacia los lados */}
        <div className="tech-line tech-horizontal tech-left tech-line-1"></div>
        <div className="tech-line tech-horizontal tech-left tech-line-2"></div>
        <div className="tech-line tech-horizontal tech-left tech-line-3"></div>
        <div className="tech-line tech-horizontal tech-left tech-line-4"></div>
        
        <div className="tech-line tech-horizontal tech-right tech-line-1"></div>
        <div className="tech-line tech-horizontal tech-right tech-line-2"></div>
        <div className="tech-line tech-horizontal tech-right tech-line-3"></div>
        <div className="tech-line tech-horizontal tech-right tech-line-4"></div>

        {/* Líneas verticales desde el centro hacia arriba/abajo */}
        <div className="tech-line tech-vertical tech-top tech-line-1"></div>
        <div className="tech-line tech-vertical tech-top tech-line-2"></div>
        <div className="tech-line tech-vertical tech-top tech-line-3"></div>
        
        <div className="tech-line tech-vertical tech-bottom tech-line-1"></div>
        <div className="tech-line tech-vertical tech-bottom tech-line-2"></div>
        <div className="tech-line tech-vertical tech-bottom tech-line-3"></div>
      </div>

      {/* Partículas tech dispersándose */}
      <div className="tech-particles">
        {[...Array(12)].map((_, i) => (
          <div 
            key={i} 
            className="tech-particle" 
            style={{
              '--particle-angle': `${(360 / 12) * i}deg`,
              '--particle-delay': `${i * 0.05}s`
            }}
          />
        ))}
      </div>

      {/* Círculos de pulso alrededor del logo */}
      <div className="pulse-rings">
        <div className="pulse-ring pulse-ring-1"></div>
        <div className="pulse-ring pulse-ring-2"></div>
        <div className="pulse-ring pulse-ring-3"></div>
      </div>
    </div>
  );
};

export default Intro;