import mqtt from 'mqtt';
import pool from '../config/db.js';
import wsService from './wsService.js';
import logger from '../utils/logger.js';
import { mqttPayloadSchema } from '../utils/schemas.js';
import notificationService from './notificationService.js';

/**
 * Servicio para manejar la conexión con el broker MQTT.
 * Procesa mensajes del ESP32 y guarda los datos en la base de datos PostgreSQL.
 */
class MQTTService {
    constructor() {
        this.client = null;
        this.latestPayload = {
            temperature: 0,
            light: 0,
            updatedAt: new Date().toISOString(),
        };
    }

    /**
     * Inicializa la conexión con el broker MQTT.
     * @param {string} url - URL del broker MQTT.
     * @param {string} topic - Topic al que suscribirse.
     */
    init(url, topic) {
        this.client = mqtt.connect(url);

        this.client.on('connect', () => {
            logger.info(`[MQTT] Conectado a ${url}`);
            this.client.subscribe(topic);
            logger.info(`[MQTT] Suscrito a ${topic}`);
        });

        this.client.on('message', async (t, payload) => {
            try {
                const rawData = JSON.parse(payload.toString());
                
                // Validar datos con Zod
                const validation = mqttPayloadSchema.safeParse(rawData);
                
                if (!validation.success) {
                    logger.warn(`[MQTT] Payload inválido recibido en ${t}:`, { 
                        errors: validation.error.format(), 
                        rawData 
                    });
                    return;
                }

                const data = validation.data;
                logger.debug(`[MQTT] Mensaje validado en ${t}:`, { topic: t, data });

                let updated = false;

                // Extraer temperatura
                if (data.temps && Array.isArray(data.temps)) {
                    const tVal = data.temps.find(x => x.temp !== null);
                    if (tVal) {
                        this.latestPayload.temperature = tVal.temp;
                        updated = true;
                        
                        // Verificar umbrales para notificaciones push (Aislado para no bloquear el flujo principal)
                        notificationService.checkTemperature(tVal.temp).catch(err => {
                            logger.error('[MQTT] Error en checkTemperature:', err);
                        });
                    }
                }

                // Extraer luz (estado/intensidad manual)
                if (data.light !== undefined) {
                    this.latestPayload.light = data.light;
                    updated = true;
                }

                // Extraer lux (luz ambiental)
                if (data.lux !== undefined) {
                    this.latestPayload.lux = data.lux;
                    updated = true;
                }

                if (updated) {
                    this.latestPayload.updatedAt = new Date().toISOString();

                    // Guardar en la base de datos (PostgreSQL)
                    await this.saveToDB(
                        this.latestPayload.temperature, 
                        this.latestPayload.light, 
                        this.latestPayload.lux
                    );

                    // Broadcast a WebSockets en tiempo real
                    wsService.broadcast(JSON.stringify({ 
                        type: 'metrics', 
                        data: this.latestPayload 
                    }));
                }

            } catch (e) {
                logger.error('[MQTT] Error procesando payload:', e);
            }
        });

        this.client.on('error', (err) => {
            logger.error('[MQTT] Error de conexión MQTT:', err);
        });

        this.client.on('close', () => {
            logger.warn('[MQTT] Conexión cerrada, reintentando...');
        });
    }

    /**
     * Guarda la lectura actual en la tabla metrics de la base de datos.
     * @param {number} temp - Valor de temperatura.
     * @param {number} light - Valor de iluminación.
     * @param {number} lux - Valor de luz ambiental.
     */
    async saveToDB(temp, light, lux) {
        try {
            // Convertir 'on'/'off' a 1/0 para la base de datos si es necesario
            const lightValue = light === 'on' ? 1 : (light === 'off' ? 0 : Number(light));

            await pool.query(
                'INSERT INTO metrics (temperature, light, lux, recorded_at) VALUES ($1, $2, $3, NOW())',
                [temp, lightValue, lux || 0]
            );
        } catch (error) {
            logger.error('[DB] Error guardando métrica:', error);
        }
    }

    /**
     * Cierra la conexión MQTT.
     */
    close() {
        if (this.client) this.client.end();
    }

    /**
     * Obtiene los últimos datos recibidos.
     */
    getLatestPayload() {
        return this.latestPayload;
    }

    /**
     * Envía un comando al ESP32 vía MQTT.
     * @param {Object} payload - Objeto con el comando (ej: { light: 'on' })
     */
    sendCommand(payload) {
        if (!this.client || !this.client.connected) {
            logger.warn('[MQTT] No se pudo enviar comando: Cliente no conectado');
            return;
        }

        const topic = process.env.MQTT_TOPIC_CMD || 'aquacontrol32/esp32/cmd';
        const msg = JSON.stringify(payload);
        
        this.client.publish(topic, msg, { qos: 1 }, (err) => {
            if (err) logger.error(`[MQTT] Error publicando comando en ${topic}:`, err);
            else logger.info(`[MQTT] Comando enviado a ${topic}: ${msg}`);
        });
    }

    /**
     * Verifica si el cliente está conectado.
     */
    isConnected() {
        return this.client ? this.client.connected : false;
    }
}

export default new MQTTService();
