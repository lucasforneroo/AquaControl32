import React from 'react';
import { useState, useEffect } from 'react'
import AnimatedBackground from './Components/AnimatedBackground';
import TemperatureControl from './Components/TemperatureControl';
import AQ32logo from './Components/AQ32logo';
import Intro from './Components/Intro';
import './App.css'

function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [metrics, setMetrics] = useState({
    temperature: 26.4,
    ph: 7.2,
    lighting: 78,
    updatedAt: null
  })

  // Estado para temperatura objetivo controlada por el usuario
  const [targetTemperature, setTargetTemperature] = useState(26.4);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:4000')

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      if (message.type === 'metrics') {
        setMetrics(message.data)
        // Actualizar temperatura objetivo si viene del servidor
        if (message.data.temperature) {
          setTargetTemperature(message.data.temperature)
        }
      }
    }

    ws.onopen = () => {
      console.log('Conectado al backend')
    }

    ws.onclose = () => {
      console.log('Desconectado del backend')
    }

    return () => {
      ws.close()
    }
  }, [])

  // Funciones para controlar la temperatura
  const handleIncreaseTemp = () => {
    setTargetTemperature(prev => {
      const newTemp = Math.round((prev + 0.5) * 10) / 10;
      console.log('Aumentando temperatura a:', newTemp);
      return newTemp;
    });
  };

  const handleDecreaseTemp = () => {
    setTargetTemperature(prev => {
      const newTemp = Math.round((prev - 0.5) * 10) / 10;
      console.log('Disminuyendo temperatura a:', newTemp);
      return newTemp;
    });
  };

  // ✅ FUNCIÓN para terminar la intro
  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  // ✅ SI showIntro es true, MOSTRAR SOLO LA INTRO
  if (showIntro) {
    return <Intro onComplete={handleIntroComplete} />;
  }

  // ✅ SI showIntro es false, MOSTRAR LA APP NORMAL
  return (
    <>
    <AnimatedBackground />
    <div className="app">
  
      
      <header className="hero">
        <div className="hero__content">

          
          <div><button className="log">login</button></div>
          <div><button className="history">Nuestra Historia</button></div>
          <div className="hero__logo">
          <AQ32logo />
          </div>
          <span className="hero__badge"></span>
          <h1>AquaControl 32</h1>
          <p>
            AquaControl32 es una plataforma para supervisar y controlar temperatura, luz y
            calidad del agua desde tu ESP32. Analiza métricas en tiempo real y toma decisiones
            rápidas para mantener tu ecosistema estable.
          </p>
          <div className="hero__actions">
            <button className="primary">Conectar dispositivo</button>
            <button className="ghost">Seleccionar dispositivo</button>
          </div>
          <div className="hero__stats">
            <div className="temp-control">
              <TemperatureControl 
                temperature={targetTemperature}
                onIncrease={handleIncreaseTemp}
                onDecrease={handleDecreaseTemp}
              />
            </div>
            <div className="light-control">
              <span><button>ON</button></span>
              <span><button>OFF</button></span>
            </div>
          </div>
        </div>
        <div className="hero__panel">
          <div className="panel__header">
            <span>Estado del acuario</span>
            <span className="panel__status">Estable</span>
          </div>
          <div className="panel__metrics">
            <article>
              <h3>Temperatura</h3>
              <p>{metrics.temperature ? `${metrics.temperature}°C` : 'N/A'}</p>
            </article>
            <article>
              <h3>Iluminación</h3>
              <p>{metrics.lighting ? `${metrics.lighting}%` : 'N/A'}</p>
            </article>
            <article>
              <h3>PH</h3>
              <p>{metrics.ph || 'N/A'}</p>
            </article>
          </div>
        </div>
      </header>

    </div>
    </>
  )
}

export default App