import pool from '../config/db.js';
import logger from '../utils/logger.js';

export const getSettings = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM system_settings WHERE id = 1');
        if (result.rows.length === 0) {
            // Si por alguna razón no existe, devolvemos default
            return res.json({
                min_ideal_temp: 16.0,
                max_ideal_temp: 26.0,
                min_alert_temp: 5.0,
                max_alert_temp: 40.0,
                light_mode: 'manual',
                light_start_time: '09:00',
                light_end_time: '21:00',
                light_manual_intensity: 100
            });
        }
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
};

export const updateSettings = async (req, res) => {
    const { min_ideal_temp, max_ideal_temp, min_alert_temp, max_alert_temp, light_mode, light_start_time, light_end_time, light_manual_intensity } = req.body;

    try {
        const query = `
            UPDATE system_settings 
            SET min_ideal_temp = $1, 
                max_ideal_temp = $2, 
                min_alert_temp = $3, 
                max_alert_temp = $4,
                light_mode = $5,
                light_start_time = $6,
                light_end_time = $7,
                light_manual_intensity = $8
            WHERE id = 1
            RETURNING *;
        `;
        
        const values = [min_ideal_temp, max_ideal_temp, min_alert_temp, max_alert_temp, light_mode, light_start_time, light_end_time, light_manual_intensity];
        const result = await pool.query(query, values);
        
        logger.info(`System settings updated: ${JSON.stringify(result.rows[0])}`);
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};
