import express from 'express'
import cors from 'cors'
import mqtt from 'mqtt'
import { WebSocketServer } from 'ws'

const app = express()
app.use(cors())
app.use(express.json())

const HTTP_PORT = 4000
const MQTT_URL = 'mqtt://localhost:1883'
const MQTT_TOPIC = 'aquacontrol32/esp32/#'

const latestPayload = {
  temperature: null,
  updatedAt: null,
}

const mqttClient = mqtt.connect(MQTT_URL)

mqttClient.on('connect', () => {
  console.log(`[MQTT] conectado a ${MQTT_URL}`)
  mqttClient.subscribe(MQTT_TOPIC)
  console.log(`[MQTT] suscrito a ${MQTT_TOPIC}`)
})

mqttClient.on('message', (topic, payload) => {
  try {
    const data = JSON.parse(payload.toString())

    if (data.temps && Array.isArray(data.temps)) {
      const t = data.temps.find(x => x.temp !== null)
      if (t) latestPayload.temperature = t.temp
    }

    latestPayload.updatedAt = new Date().toISOString()
    broadcast(JSON.stringify({ type: 'metrics', data: latestPayload }))
  } catch (e) {
    console.error('[MQTT] payload inválido', e)
  }
})

const server = app.listen(HTTP_PORT, () => {
  console.log(`[HTTP] http://localhost:${HTTP_PORT}`)
})

const wss = new WebSocketServer({ server })

function broadcast(msg) {
  for (const c of wss.clients) {
    if (c.readyState === c.OPEN) c.send(msg)
  }
}

wss.on('connection', ws => {
  ws.send(JSON.stringify({ type: 'metrics', data: latestPayload }))
})
