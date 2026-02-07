import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [metrics, setMetrics] = useState({
    temperature: 26.4,
    ph: 7.2,
    lighting: 78,
    updatedAt: null
  })

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:4000')

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      if (message.type === 'metrics') {
        setMetrics(message.data)
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

  return (
    <div className="app">
      <header className="hero">
        <div className="hero__content">
          <span className="hero__badge">Dashboard inteligente</span>
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
            <div>
              <p>Aumentar temperatura</p>
              <span><button>+</button></span>
            </div>
            <div>
              <p>Disminuir temperatura</p>
              <span><button>-</button></span>
            </div>
            <div>
              <p>Encender luces</p>
              <span><button>ON</button></span>
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
              <span>Objetivo 26°C</span>
            </article>
            <article>
              <h3>Iluminación</h3>
              <p>{metrics.lighting ? `${metrics.lighting}%` : 'N/A'}</p>
              <span>Modo Amanecer</span>
            </article>
            <article>
              <h3>PH</h3>
              <p>{metrics.ph || 'N/A'}</p>
              <span>Balanceado</span>
            </article>
          </div>
          <div className="panel__timeline">
            <div>
              <span>08:00</span>
              <span>Encendido gradual</span>
            </div>
            <div>
              <span>12:30</span>
              <span>Alerta nivel agua</span>
            </div>
            <div>
              <span>18:00</span>
              <span>Modo nocturno</span>
            </div>
          </div>
        </div>
      </header>

      <section className="features">
        <article>
          <h2>Control centralizado</h2>
          <p>
            Gestiona sensores, actuadores y rutinas desde un único panel con accesos rápidos y
            vistas personalizadas.
          </p>
        </article>
        <article>
          <h2>Alertas proactivas</h2>
          <p>
            Recibe notificaciones inteligentes cuando una métrica sale de rango y activa
            respuestas automáticas.
          </p>
        </article>
        <article>
          <h2>Historial detallado</h2>
          <p>
            Visualiza tendencias de temperatura, iluminación y calidad del agua para optimizar
            el bienestar de tu ecosistema.
          </p>
        </article>
      </section>
    </div>
  )
}

export default App