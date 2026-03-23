import { Expo } from 'expo-server-sdk';
import pool from '../config/db.js';
import logger from '../utils/logger.js';

class NotificationService {
    constructor() {
        this.expo = new Expo();
        // Cooldown por usuario para evitar spam (5 minutos)
        // Estructura: { userId: { lastSentAt: Date, lastLevel: 'normal'|'warning'|'critical' } }
        this.cooldowns = new Map();
        this.tokenCache = null;
        this.lastTokenFetch = 0;
    }

    /**
     * Evalúa la temperatura y envía notificaciones si es necesario.
     * @param {number} temp - Temperatura actual.
     */
    async checkTemperature(temp) {
        if (temp === null || temp === undefined) return;

        let level = 'normal';
        let title = '';
        let message = '';

        try {
            // Cargar configuración global dinámica
            let thresholds = {
                min_ideal_temp: 16.0,
                max_ideal_temp: 26.0,
                min_alert_temp: 5.0,
                max_alert_temp: 40.0
            };
            const result = await pool.query('SELECT * FROM system_settings WHERE id = 1');
            if (result.rows.length > 0) {
                thresholds = result.rows[0];
            }

            // Peligro primero
            if (temp <= thresholds.min_alert_temp || temp >= thresholds.max_alert_temp) {
                level = 'critical';
                title = '🚨 ¡ALERTA ROJA - TEMPERATURA CRÍTICA! 🚨';
                message = `¡Atención! La temperatura del acuario está en ${temp.toFixed(1)}°C. Es un nivel peligroso fuera del límite (${thresholds.min_alert_temp}°C - ${thresholds.max_alert_temp}°C).`;
            }
            // Advertencia (fuera de rango ideal pero no crítico)
            else if (temp < thresholds.min_ideal_temp || temp > thresholds.max_ideal_temp) {
                level = 'warning';
                title = '⚠️ Advertencia de Temperatura ⚠️';
                message = `La temperatura cambió a ${temp.toFixed(1)}°C, fuera del rango ideal (${thresholds.min_ideal_temp}°C - ${thresholds.max_ideal_temp}°C).`;
            }

            logger.debug(`[Push] Check: temp=${temp}, level=${level}`);

            if (level !== 'normal') {
                await this.sendAlertToAll(level, title, message);
            } else {
                // Resetear cooldown si vuelve a nivel normal para que la próxima alerta salga inmediata
                if (this.cooldowns.size > 0) {
                    logger.debug(`[Push] Volvió a normal, reseteando cooldowns.`);
                    this.cooldowns.clear();
                }
            }
        } catch (error) {
            logger.error('[Push] Error evaluando temperatura con DB settings:', error);
        }
    }

    /**
     * Envía una notificación a todos los usuarios con push tokens registrados.
     */
    async sendAlertToAll(level, title, message) {
        try {
            const now = Date.now();

            // Caché de tokens por 1 minuto para no saturar la DB
            if (!this.tokenCache || (now - this.lastTokenFetch > 60000)) {
                const result = await pool.query('SELECT id, email, push_token FROM users WHERE push_token IS NOT NULL');
                this.tokenCache = result.rows;
                this.lastTokenFetch = now;
                logger.debug(`[Push] Cache de tokens actualizado: ${this.tokenCache.length} usuarios.`);
            }

            const users = this.tokenCache;
            logger.info(`[Push] Evaluando envío a ${users.length} usuarios (Cache).`);

            if (users.length === 0) return;

            const messages = [];

            for (const user of users) {
                logger.debug(`[Push] Usuario: ${user.email}, Token: ${user.push_token}`);
                const cooldown = this.cooldowns.get(user.id);

                // Si ya enviamos una alerta del mismo nivel hace menos de 5 minutos, ignoramos (para no spamear)
                // Pero si el nivel sube de warning a critical, enviamos inmediatamente.
                if (cooldown && cooldown.lastLevel === level && (now - cooldown.lastSentAt < 300000)) {
                    continue;
                }

                if (!Expo.isExpoPushToken(user.push_token)) {
                    logger.error(`[Push] Token inválido para usuario ${user.id}: ${user.push_token}`);
                    continue;
                }

                messages.push({
                    to: user.push_token,
                    sound: 'default',
                    title: title,
                    body: message,
                    data: { level, temp: true },
                    priority: level === 'critical' ? 'high' : 'normal',
                });

                // Actualizar cooldown
                this.cooldowns.set(user.id, { lastSentAt: now, lastLevel: level });
            }

            if (messages.length > 0) {
                await this.sendBatch(messages);
            }

        } catch (error) {
            logger.error('[Push] Error enviando alertas:', error);
        }
    }

    /**
     * Envía un batch de notificaciones usando el SDK de Expo.
     */
    async sendBatch(messages) {
        const chunks = this.expo.chunkPushNotifications(messages);
        const tickets = [];

        for (const chunk of chunks) {
            try {
                const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                logger.error('[Push] Error en chunk de envío:', error);
            }
        }

        logger.info(`[Push] Notificaciones enviadas: ${messages.length}`);
    }
}

export default new NotificationService();
