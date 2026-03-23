import pool from './src/config/db.js';
import notificationService from './src/services/notificationService.js';
import logger from './src/utils/logger.js';
import 'dotenv/config';

async function testPush() {
    try {
        logger.info('🚀 Iniciando prueba de Push Notification...');
        
        const temp = 45; // Debería disparar nivel CRITICAL
        await notificationService.checkTemperature(temp);
        
        logger.info('✅ Prueba completada. Revisa los logs/combined.log para ver los resultados de [Push].');
        process.exit(0);
    } catch (error) {
        logger.error('❌ Error en prueba de Push:', error);
        process.exit(1);
    }
}

testPush();
