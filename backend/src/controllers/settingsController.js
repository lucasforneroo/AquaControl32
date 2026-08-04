import pool from '../config/db.js';
import logger from '../utils/logger.js';
import mqttService from '../services/mqttService.js';

const SETTINGS_FIELDS = [
    'min_ideal_temp',
    'max_ideal_temp',
    'min_alert_temp',
    'max_alert_temp',
    'light_override_schedule_enabled',
    'light_schedule_start',
    'light_schedule_end',
    'light_override_intensity_enabled',
    'light_intensity_value'
];

const validateTemperatureRanges = (settings) => {
    const minIdeal = Number(settings.min_ideal_temp);
    const maxIdeal = Number(settings.max_ideal_temp);
    const minAlert = Number(settings.min_alert_temp);
    const maxAlert = Number(settings.max_alert_temp);

    if (![minIdeal, maxIdeal, minAlert, maxAlert].every(Number.isFinite)) {
        return 'Los límites de temperatura deben ser valores numéricos válidos.';
    }

    if (minIdeal >= maxIdeal) {
        return 'La temperatura mínima ideal debe ser menor que la máxima ideal.';
    }

    if (minAlert >= minIdeal) {
        return 'El límite crítico mínimo debe ser menor que la temperatura mínima ideal.';
    }

    if (maxAlert <= maxIdeal) {
        return 'El límite crítico máximo debe ser mayor que la temperatura máxima ideal.';
    }

    return null;
};

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
    try {
        // Cada pantalla actualiza solo su sección. Fusionamos el payload con
        // la configuración persistida antes de validarla y guardarla.
        const currentResult = await pool.query('SELECT * FROM system_settings WHERE id = 1');
        if (currentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Configuración del sistema no encontrada.' });
        }

        const settings = { ...currentResult.rows[0] };
        for (const field of SETTINGS_FIELDS) {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                settings[field] = req.body[field];
            }
        }

        const validationError = validateTemperatureRanges(settings);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

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
            settings.min_ideal_temp, settings.max_ideal_temp,
            settings.min_alert_temp, settings.max_alert_temp,
            settings.light_override_schedule_enabled, settings.light_schedule_start,
            settings.light_schedule_end, settings.light_override_intensity_enabled,
            settings.light_intensity_value
        ];
        const result = await pool.query(query, values);
        
        const updatedSettings = result.rows[0];
        logger.info(`System settings updated: ${JSON.stringify(updatedSettings)}`);

        // Aplicar el override de intensidad en el acto. El cron conserva esta
        // configuración y gestiona los horarios, pero no debe haber hasta un
        // minuto de espera al guardar desde LightManagement.
        const lightCommand = {
            override_intensity: Boolean(updatedSettings.light_override_intensity_enabled)
        };

        if (lightCommand.override_intensity) {
            lightCommand.intensity = Number(updatedSettings.light_intensity_value);
        }

        mqttService.sendCommand(lightCommand);
        
        res.json(updatedSettings);
    } catch (error) {
        logger.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};
