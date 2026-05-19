import pool from '../config/db.js';
import logger from '../utils/logger.js';

class RetentionService {
    constructor() {
        this.interval = null;
    }

    /**
     * Inicializa el servicio de retención.
     * Se ejecuta inmediatamente y luego cada hora.
     */
    init() {
        logger.info('[Retention] Iniciando servicio de retención y agregación...');
        
        // Ejecutar inmediatamente al arrancar
        this.run();

        // Configurar intervalo de 1 hora (3600000 ms)
        this.interval = setInterval(() => this.run(), 3600000);
    }

    /**
     * Ejecuta la lógica de agregación y limpieza.
     */
    async run() {
        try {
            logger.info('[Retention] Ejecutando política de retención...');
            
            await this.aggregateMetrics();
            await this.purgeOldMetrics();
            
            logger.info('[Retention] Política de retención completada con éxito.');
        } catch (error) {
            logger.error('[Retention] Error en el servicio de retención:', error);
        }
    }

    /**
     * Agrega las métricas de la última hora en un solo registro de promedio.
     */
    async aggregateMetrics() {
        try {
            // Buscamos la última hora que no haya sido agregada aún
            // Tomamos los datos del rango [ahora-2h, ahora-1h] para asegurar que la hora esté completa
            const query = `
                INSERT INTO hourly_metrics (avg_temperature, avg_light, recorded_at)
                SELECT 
                    AVG(temperature)::numeric(5,2),
                    AVG(light)::numeric(5,2),
                    date_trunc('hour', recorded_at) as hour
                FROM metrics
                WHERE recorded_at < date_trunc('hour', NOW())
                  AND recorded_at >= date_trunc('hour', NOW()) - INTERVAL '24 hours'
                GROUP BY hour
                ON CONFLICT (recorded_at) DO NOTHING;
            `;
            
            const result = await pool.query(query);
            if (result.rowCount > 0) {
                logger.info(`[Retention] Agregadas ${result.rowCount} horas nuevas a hourly_metrics.`);
            }
        } catch (error) {
            logger.error('[Retention] Error agregando métricas:', error);
        }
    }

    /**
     * Borra las métricas detalladas (raw) que tengan más de 7 días.
     */
    async purgeOldMetrics() {
        try {
            const result = await pool.query(`
                DELETE FROM metrics 
                WHERE recorded_at < NOW() - INTERVAL '7 days';
            `);
            
            if (result.rowCount > 0) {
                logger.info(`[Retention] Se eliminaron ${result.rowCount} registros antiguos de la tabla metrics.`);
            }
        } catch (error) {
            logger.error('[Retention] Error purgando métricas antiguas:', error);
        }
    }

    /**
     * Detiene el servicio.
     */
    stop() {
        if (this.interval) clearInterval(this.interval);
    }
}

export default new RetentionService();
