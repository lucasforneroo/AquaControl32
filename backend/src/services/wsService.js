import { WebSocketServer } from 'ws';
import logger from '../utils/logger.js';

/**
 * Servicio para manejar el servidor WebSocket.
 * Permite comunicación en tiempo real con la aplicación móvil.
 */
class WSService {
    constructor() {
        this.wss = null;
        this.heartbeatInterval = null;
    }

    /**
     * Inicializa el servidor WebSocket sobre un servidor HTTP existente.
     * @param {Object} server - Servidor HTTP de Express.
     * @param {Object} latestPayload - Referencia a los últimos datos recibidos.
     */
    init(server, latestPayload) {
        this.wss = new WebSocketServer({ server });

        this.wss.on('connection', (ws, req) => {
            const clientIP = req.socket.remoteAddress;
            console.log(`[WS] Nueva conexión desde ${clientIP}`);
            
            ws.isAlive = true;
            ws.on('pong', () => { ws.isAlive = true; });

            ws.on('error', (err) => {
                console.error('[WS] Error del cliente:', err.message);
            });

            // Enviar estado inicial
            ws.send(JSON.stringify({
                type: 'metrics',
                data: latestPayload
            }));

            ws.send(JSON.stringify({
                type: 'welcome',
                message: 'Conectado a AquaControl32 🌡️💡',
                timestamp: new Date().toISOString(),
            }));

            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    if (message.type === 'command') {
                        logger.info(`[WS] Comando recibido:`, message.payload);
                        
                        // Reenviar a MQTT
                        const mqttService = (await import('./mqttService.js')).default;
                        mqttService.sendCommand(message.payload);
                    }
                } catch (e) {
                    logger.error('[WS] Error procesando mensaje del cliente:', e);
                }
            });

            ws.on('close', () => {
                console.log(`[WS] Cliente desconectado ${clientIP}`);
            });
        });

        // Configurar heartbeat cada 30s
        this.heartbeatInterval = setInterval(() => {
            this.wss.clients.forEach(ws => {
                if (ws.isAlive === false) return ws.terminate();
                ws.isAlive = false;
                ws.ping();
            });
        }, 30000);

        console.log(`[WS] Servidor WebSocket iniciado`);
    }

    /**
     * Envía un mensaje a todos los clientes conectados.
     * @param {string} msg - Mensaje en formato string (JSON).
     */
    broadcast(msg) {
        if (!this.wss) return;
        this.wss.clients.forEach(client => {
            if (client.readyState === client.OPEN) {
                client.send(msg);
            }
        });
    }

    /**
     * Cierra el servidor y limpia intervalos.
     */
    close() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        if (this.wss) this.wss.close();
    }

    /**
     * Obtiene la cantidad de clientes conectados.
     */
    getConnectedClients() {
        return this.wss ? this.wss.clients.size : 0;
    }
}

export default new WSService();
