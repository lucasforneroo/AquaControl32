import express from 'express';
import pool from '../config/db.js';
import logger from '../utils/logger.js';
import { validate } from '../middlewares/validationMiddleware.js';
import { metricsQuerySchema } from '../utils/schemas.js';

const router = express.Router();

/**
 * GET /metrics/history
 * Retorna el historial de temperatura y luz filtrado por horas.
 * Query defaults to 24 hours if not specified.
 */
router.get('/history', validate(metricsQuerySchema, 'query'), async (req, res) => {
    try {
        const hours = req.query.hours || 24;
        
        // Si piden más de 7 días (168h), usamos la tabla de promedios hourly_metrics
        // para mejorar el rendimiento y evitar saturar el gráfico.
        const useAggregated = hours > 168;
        const tableName = useAggregated ? 'hourly_metrics' : 'metrics';
        const tempCol = useAggregated ? 'avg_temperature as temperature' : 'temperature';
        const lightCol = useAggregated ? 'avg_light as light' : 'light';

        const result = await pool.query(`
            SELECT 
                ${tempCol}, 
                ${lightCol}, 
                recorded_at 
            FROM ${tableName} 
            WHERE recorded_at >= NOW() - ($1 * INTERVAL '1 hour')
            ORDER BY recorded_at ASC
        `, [hours]);

        res.json(result.rows);
    } catch (error) {
        logger.error('Error obteniendo historial:', error);
        res.status(500).json({ error: 'Error al obtener el historial de métricas' });
    }
});

/**
 * GET /metrics/stats
 * Retorna estadísticas básicas de las últimas 24 horas.
 */
router.get('/stats', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                MIN(temperature) as min_temp,
                MAX(temperature) as max_temp,
                AVG(temperature)::numeric(10,2) as avg_temp,
                MIN(light) as min_light,
                MAX(light) as max_light,
                AVG(light)::numeric(10,2) as avg_light
            FROM metrics 
            WHERE recorded_at >= NOW() - INTERVAL '24 hours'
        `);

        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error obteniendo estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas de métricas' });
    }
});

export default router;
