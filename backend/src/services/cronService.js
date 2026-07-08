import cron from 'node-cron';
import pool from '../config/db.js';
import mqttService from './mqttService.js';
import logger from '../utils/logger.js';

class CronService {
    constructor() {
        this.task = null;
    }

    start() {
        // Run every minute
        this.task = cron.schedule('* * * * *', async () => {
            try {
                logger.debug('[CRON] Executing light override evaluation...');
                const result = await pool.query('SELECT * FROM system_settings WHERE id = 1');
                if (result.rows.length === 0) return;
                
                const settings = result.rows[0];
                const payload = {};

                if (settings.light_override_schedule_enabled) {
                    const now = new Date();
                    const currentHour = now.getHours();
                    const currentMinute = now.getMinutes();
                    const currentTotal = currentHour * 60 + currentMinute;

                    const [startH, startM] = settings.light_schedule_start.split(':').map(Number);
                    const startTotal = startH * 60 + startM;

                    const [endH, endM] = settings.light_schedule_end.split(':').map(Number);
                    const endTotal = endH * 60 + endM;

                    let light_on = false;
                    if (startTotal <= endTotal) {
                        light_on = currentTotal >= startTotal && currentTotal <= endTotal;
                    } else {
                        // crosses midnight
                        light_on = currentTotal >= startTotal || currentTotal <= endTotal;
                    }
                    payload.light_on = light_on;
                }
                // Si hay override de intensidad, siempre mandamos el estado de la intensidad
                // aunque el encendido lo controle el botón del dashboard
                payload.override_intensity = settings.light_override_intensity_enabled;
                if (settings.light_override_intensity_enabled) {
                    payload.intensity = settings.light_intensity_value;
                }

                if (Object.keys(payload).length > 0) {
                    // We send the MQTT command
                    logger.info(`[CRON] Dispatching MQTT command: ${JSON.stringify(payload)}`);
                    this.dispatchWithRetry(payload, 3);
                } else {
                    logger.debug('[CRON] No active overrides, skipping MQTT dispatch.');
                }
            } catch (error) {
                logger.error('[CRON] Error evaluating light configurations:', error);
            }
        });

        logger.info('[CRON] Cron service started successfully.');
    }

    dispatchWithRetry(payload, retriesLeft = 3) {
        if (mqttService.isConnected()) {
            mqttService.sendCommand(payload);
        } else {
            if (retriesLeft > 0) {
                logger.warn(`[CRON] MQTT client not connected. Retrying in 5 seconds... (${retriesLeft} retries left)`);
                setTimeout(() => {
                    this.dispatchWithRetry(payload, retriesLeft - 1);
                }, 5000);
            } else {
                logger.error('[CRON] Failed to dispatch MQTT command: Client disconnected after all retries.');
            }
        }
    }
}

export default new CronService();
