// ============================================
// IMPORTS Y CONFIGURACIÓN
// ============================================
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { getLocalIP } from './utils/ipUtils.js'
import mqttService from './services/mqttService.js'
import wsService from './services/wsService.js'
import retentionService from './services/retentionService.js'
import cronService from './services/cronService.js'
import { Bonjour } from 'bonjour-service'
import logger from './utils/logger.js'

// Importar rutas modulares
import authRoutes from './routes/authRoutes.js'
import metricsRoutes from './routes/metricsRoutes.js'
import settingsRoutes from './routes/settingsRoutes.js'

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
// mDNS: ANUNCIO DE SERVICIO
// ============================================
const bonjour = new Bonjour()
const serviceName = 'aquacontrol'
const serviceType = 'http'
const servicePort = HTTP_PORT

bonjour.publish({ 
  name: serviceName, 
  type: serviceType, 
  port: servicePort,
  txt: { 
    path: '/',
    version: '2.1.0',
    server: 'AquaControl32-Backend'
  }
})

logger.info(`[mDNS] Anunciando servicio '${serviceName}' en puerto ${servicePort}`)
logger.info(`[mDNS] URL sugerida: http://${serviceName}.local:${servicePort}`)

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
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`)
  next()
})

// ============================================
// INICIALIZACIÓN DE SERVICIOS (MQTT, WS & Retention)
// ============================================
mqttService.init(MQTT_URL, MQTT_TOPIC)
retentionService.init()
cronService.start()

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

/**
 * RUTAS DE CONFIGURACIÓN GLOBAL (Rangos de Alarma)
 */
app.use("/settings", settingsRoutes)

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
  logger.error("Error no manejado:", err)
  res.status(500).json({
    error: "Error interno del servidor",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  })
})

// ============================================
// INICIAR SERVIDOR HTTP Y WEBSOCKET
// ============================================
const server = app.listen(HTTP_PORT, '0.0.0.0', () => {
  logger.info("=".repeat(60))
  logger.info(`AquaControl32 Backend v2.1 iniciado`)
  logger.info("=".repeat(60))
  logger.info(`IP Local detectada: ${LOCAL_IP}`)
  logger.info(`HTTP Server: http://localhost:${HTTP_PORT}`)
  logger.info(`Desde celular: http://${LOCAL_IP}:${HTTP_PORT}`)
  logger.info(`WebSocket: ws://${LOCAL_IP}:${HTTP_PORT}`)
  logger.info(`MQTT Broker: ${MQTT_URL}`)
  logger.info(`MQTT Topic: ${MQTT_TOPIC}`)
  logger.info("=".repeat(60))
  logger.info(`Entorno: ${process.env.NODE_ENV || "development"}`)
  logger.info(`Database: ${process.env.DATABASE_URL ? "Configurada" : "No configurada"}`)
  logger.info("=".repeat(60))
})

// Inicializar WebSocket Server sobre el servidor Express
wsService.init(server, mqttService.getLatestPayload())

// ============================================
// MANEJO DE CIERRE GRACEFUL
// ============================================
process.on('SIGTERM', () => {
  logger.info('SIGTERM recibido, cerrando servidor...')

  server.close(() => {
    logger.info('Servidor HTTP cerrado')
    mqttService.close()
    wsService.close()
    retentionService.stop()
    logger.info('Servicios finalizados')
    process.exit(0)
  })
})

export default app
