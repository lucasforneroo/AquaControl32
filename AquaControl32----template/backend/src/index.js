// ============================================
// IMPORTS Y CONFIGURACIÓN
// ============================================
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { getLocalIP } from './utils/ipUtils.js'
import mqttService from './services/mqttService.js'
import wsService from './services/wsService.js'
import { Bonjour } from 'bonjour-service'

const bonjour = new Bonjour()
bonjour.publish({ name: 'aquacontrol', type: 'http', port: 4000 })
console.log(`[mDNS] Anunciando servicio como 'aquacontrol.local'`)

// Importar rutas modulares
import authRoutes from './routes/authRoutes.js'
import metricsRoutes from './routes/metricsRoutes.js'

// ============================================
// CREAR APLICACIÓN EXPRESS
// ============================================
const app = express()

// ============================================
// CONFIGURACIÓN
// ============================================
const HTTP_PORT = process.env.PORT || 4000
const MQTT_URL = process.env.MQTT_URL || 'mqtt://localhost:1883'
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'aquacontrol32/esp32/#'
const LOCAL_IP = getLocalIP()

// ============================================
// MIDDLEWARES GLOBALES
// ============================================

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
}))

app.use(express.json())

/**
 * Logger simple para desarrollo
 */
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`)
    next()
  })
}

// ============================================
// INICIALIZACIÓN DE SERVICIOS (MQTT & WS)
// ============================================
mqttService.init(MQTT_URL, MQTT_TOPIC)

// ============================================
// RUTAS HTTP REST API
// ============================================

/**
 * GET / - Health check
 */
app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "AquaControl32 API",
    version: "2.1.0",
    timestamp: new Date().toISOString(),
    mqtt: mqttService.isConnected() ? "Conectado" : "Desconectado",
    websocket: `${wsService.getConnectedClients()} clientes conectados`,
    localIP: LOCAL_IP,
  })
})

/**
 * GET /latest - Obtener últimos datos
 */
app.get("/latest", (req, res) => {
  res.json(mqttService.getLatestPayload())
})

/**
 * RUTAS DE AUTENTICACIÓN
 */
app.use("/auth", authRoutes)

/**
 * RUTAS DE MÉTRICAS (Historial y estadísticas)
 */
app.use("/metrics", metricsRoutes)

// ============================================
// MANEJO DE ERRORES HTTP
// ============================================

app.use((req, res) => {
  res.status(404).json({
    error: "Ruta no encontrada",
    path: req.path,
    method: req.method,
  })
})

app.use((err, req, res, next) => {
  console.error("Error no manejado:", err)
  res.status(500).json({
    error: "Error interno del servidor",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  })
})

// ============================================
// INICIAR SERVIDOR HTTP Y WEBSOCKET
// ============================================
const server = app.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log("=".repeat(60))
  console.log(`AquaControl32 Backend v2.1 iniciado`)
  console.log("=".repeat(60))
  console.log(`IP Local detectada: ${LOCAL_IP}`)
  console.log(`HTTP Server: http://localhost:${HTTP_PORT}`)
  console.log(`Desde celular: http://${LOCAL_IP}:${HTTP_PORT}`)
  console.log(`WebSocket: ws://${LOCAL_IP}:${HTTP_PORT}`)
  console.log(`MQTT Broker: ${MQTT_URL}`)
  console.log(`MQTT Topic: ${MQTT_TOPIC}`)
  console.log("=".repeat(60))
  console.log(`Entorno: ${process.env.NODE_ENV || "development"}`)
  console.log(`Database: ${process.env.DATABASE_URL ? "Configurada" : "No configurada"}`)
  console.log("=".repeat(60))
})

// Inicializar WebSocket Server sobre el servidor Express
wsService.init(server, mqttService.getLatestPayload())

// ============================================
// MANEJO DE CIERRE GRACEFUL
// ============================================
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando servidor...')

  server.close(() => {
    console.log('Servidor HTTP cerrado')
    mqttService.close()
    wsService.close()
    console.log('Servicios finalizados')
    process.exit(0)
  })
})

export default app
