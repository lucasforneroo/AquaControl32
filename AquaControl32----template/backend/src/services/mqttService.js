import mqtt from 'mqtt';
import pool from '../config/db.js';
import wsService from './wsService.js';

/**
 * Servicio para manejar la conexión con el broker MQTT.
 * Procesa mensajes del ESP32 y guarda los datos en la base de datos PostgreSQL.
 */
class MQTTService {
    constructor() {
        this.client = null;
        this.latestPayload = {
            temperature: null,
            light: null,
            updatedAt: null,
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
            console.log(`[MQTT] Conectado a ${url}`);
            this.client.subscribe(topic);
            console.log(`[MQTT] Suscrito a ${topic}`);
        });

        this.client.on('message', async (t, payload) => {
            try {
                const data = JSON.parse(payload.toString());
                console.log(`[MQTT] Mensaje recibido en ${t}:`, data);

                let updated = false;

                // Extraer temperatura
                if (data.temps && Array.isArray(data.temps)) {
                    const tVal = data.temps.find(x => x.temp !== null);
                    if (tVal) {
                        this.latestPayload.temperature = tVal.temp;
                        updated = true;
                    }
                }

                // Extraer luz
                if (data.light !== undefined) {
                    this.latestPayload.light = data.light;
                    updated = true;
                }

                if (updated) {
                    this.latestPayload.updatedAt = new Date().toISOString();

                    // Guardar en la base de datos (PostgreSQL)
                    await this.saveToDB(this.latestPayload.temperature, this.latestPayload.light);

                    // Broadcast a WebSockets en tiempo real
                    wsService.broadcast(JSON.stringify({ 
                        type: 'metrics', 
                        data: this.latestPayload 
                    }));
                }

            } catch (e) {
                console.error('[MQTT] Error procesando payload:', e.message);
            }
        });

        this.client.on('error', (err) => {
            console.error('[MQTT] Error de conexión:', err.message);
        });

        this.client.on('close', () => {
            console.log('[MQTT] Conexión cerrada, reintentando...');
        });
    }

    /**
     * Guarda la lectura actual en la tabla metrics de la base de datos.
     * @param {number} temp - Valor de temperatura.
     * @param {number} light - Valor de iluminación.
     */
    async saveToDB(temp, light) {
        try {
            await pool.query(
                'INSERT INTO metrics (temperature, light, recorded_at) VALUES ($1, $2, NOW())',
                [temp, light]
            );
            // console.log('[DB] Métrica guardada exitosamente');
        } catch (error) {
            console.error('[DB] Error guardando métrica:', error.message);
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
     * Verifica si el cliente está conectado.
     */
    isConnected() {
        return this.client ? this.client.connected : false;
    }
}

export default new MQTTService();
