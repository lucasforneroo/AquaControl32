import express from 'express'
import cors from 'cors'
import mqtt from 'mqtt'
import { WebSocketServer } from 'ws'

const app = express()
app.use(cors())
app.use(express.json())

const HTTP_PORT = process.env.HTTP_PORT || 4000
const MQTT_URL = process.env.MQTT_URL || 'mqtt://broker.hivemq.com'
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'test/aquacontrol'

const latestPayload = {
  temperature: null,
  ph: null,
  lighting: null,
  updatedAt: null,
}

const mqttClient = mqtt.connect(MQTT_URL, {
  reconnectPeriod: 2000,
})

mqttClient.on('connect', () => {
  console.log(`[MQTT] conectado a ${MQTT_URL}`)
  mqttClient.subscribe(MQTT_TOPIC, { qos: 0 }, (error) => {
    if (error) {
      console.error('[MQTT] error al suscribirse:', error)
      return
    }
    console.log(`[MQTT] suscrito a ${MQTT_TOPIC}`)
  })
})

mqttClient.on('message', (topic, payload) => {
  if (topic !== MQTT_TOPIC) return
  try {
    const data = JSON.parse(payload.toString())
    // Handle both formats: simple {temperature, ph, lighting} or complex from ESP32
    if (data.temps && Array.isArray(data.temps)) {
      // Complex format from ESP32 code
      const tempSensor = data.temps.find(t => !isNaN(t.temp))
      latestPayload.temperature = tempSensor ? tempSensor.temp : latestPayload.temperature
      latestPayload.ph = latestPayload.ph // keep existing
      latestPayload.lighting = latestPayload.lighting // keep existing
    } else {
      // Simple format
      latestPayload.temperature = data.temperature ?? latestPayload.temperature
      latestPayload.ph = data.ph ?? latestPayload.ph
      latestPayload.lighting = data.lighting ?? latestPayload.lighting
    }
    latestPayload.updatedAt = new Date().toISOString()
    broadcast(JSON.stringify({ type: 'metrics', data: latestPayload }))
  } catch (error) {
    console.error('[MQTT] payload inválido', error)
  }
})

mqttClient.on('error', (error) => {
  console.error('[MQTT] error', error)
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/api/metrics', (_req, res) => {
  res.json(latestPayload)
})

const server = app.listen(HTTP_PORT, () => {
  console.log(`[HTTP] escuchando en http://localhost:${HTTP_PORT}`)
})

const wss = new WebSocketServer({ server })

function broadcast(message) {
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(message)
    }
  }
}

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'metrics', data: latestPayload }))
})