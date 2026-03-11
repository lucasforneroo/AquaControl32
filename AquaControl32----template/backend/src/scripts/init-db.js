import pool from '../config/db.js';

const initDb = async () => {
    try {
        console.log('--- Iniciando creación de tablas en PostgreSQL ---');
        
        // Crear tabla de usuarios
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                google_id VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255),
                picture TEXT,
                role VARCHAR(50) DEFAULT 'user',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabla «users» verificada/creada');

        // Crear tabla de métricas
        await pool.query(`
            CREATE TABLE IF NOT EXISTS metrics (
                id SERIAL PRIMARY KEY,
                temperature DECIMAL(5, 2),
                light DECIMAL(5, 2),
                recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabla «metrics» verificada/creada');

        // Crear índice
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_metrics_recorded_at ON metrics(recorded_at DESC);
        `);
        console.log('✅ Índice de métricas creado');

        console.log('--- Proceso de inicialización completado con éxito ---');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error inicializando la base de datos:', error.message);
        process.exit(1);
    }
};

initDb();
