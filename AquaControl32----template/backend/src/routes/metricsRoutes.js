import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

/**
 * GET /metrics/history
 * Retorna el historial de temperatura y luz filtrado por horas.
 * Query defaults to 24 hours if not specified.
 */
router.get('/history', async (req, res) => {
    try {
        const hours = parseInt(req.query.hours) || 24;
        
        const result = await pool.query(`
            SELECT 
                temperature, 
                light, 
                recorded_at 
            FROM metrics 
            WHERE recorded_at >= NOW() - ($1 || ' hours')::interval
            ORDER BY recorded_at ASC
        `, [hours]);

        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error obteniendo historial:', error.message);
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
        console.error('❌ Error obteniendo estadísticas:', error.message);
        res.status(500).json({ error: 'Error al obtener estadísticas de métricas' });
    }
});

export default router;
