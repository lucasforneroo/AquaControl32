import pool from '../config/db.js';
import logger from '../utils/logger.js';
import mqttService from '../services/mqttService.js';

export const getSettings = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM system_settings WHERE id = 1');
        if (result.rows.length === 0) {
            return res.json({
                min_ideal_temp: 16.0,
                max_ideal_temp: 26.0,
                min_alert_temp: 5.0,
                max_alert_temp: 40.0,
                light_override_schedule_enabled: false,
                light_schedule_start: '09:00',
                light_schedule_end: '21:00',
                light_override_intensity_enabled: false,
                light_intensity_value: 100
            });
        }
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
};

export const updateSettings = async (req, res) => {
    const { 
        min_ideal_temp, max_ideal_temp, min_alert_temp, max_alert_temp, 
        light_override_schedule_enabled, light_schedule_start, light_schedule_end, 
        light_override_intensity_enabled, light_intensity_value 
    } = req.body;

    try {
        const query = `
            UPDATE system_settings 
            SET min_ideal_temp = $1, 
                max_ideal_temp = $2, 
                min_alert_temp = $3, 
                max_alert_temp = $4,
                light_override_schedule_enabled = $5,
                light_schedule_start = $6,
                light_schedule_end = $7,
                light_override_intensity_enabled = $8,
                light_intensity_value = $9
            WHERE id = 1
            RETURNING *;
        `;
        
        const values = [
            min_ideal_temp, max_ideal_temp, min_alert_temp, max_alert_temp, 
            light_override_schedule_enabled, light_schedule_start, light_schedule_end, 
            light_override_intensity_enabled, light_intensity_value
        ];
        const result = await pool.query(query, values);
        
        const updatedSettings = result.rows[0];
        logger.info(`System settings updated: ${JSON.stringify(updatedSettings)}`);

        // Phase 2 will implement MQTT publishing in cronjob, maybe remove this manual sendCommand or keep for immediate update
        // We'll leave it simple for now, maybe we can just trigger it here too.
        // Actually the spec says "cronjob evaluates every minute". So we can just leave it out from here or send empty for now.
        // I will remove the manual MQTT update here because cron handles it, or I can update it based on Phase 2.
        
        res.json(updatedSettings);
    } catch (error) {
        logger.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};
