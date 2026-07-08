import pool from '../config/db.js';

const initDb = async () => {
    try {
        console.log('--- Iniciando creación de tablas en PostgreSQL ---');
        
        // Tabla: users
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                google_id VARCHAR(255) UNIQUE,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255),
                name VARCHAR(255),
                picture TEXT,
                role VARCHAR(50) DEFAULT 'user',
                push_token VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabla «users» verificada/creada');

        // Tabla: metrics
        await pool.query(`
            CREATE TABLE IF NOT EXISTS metrics (
                id SERIAL PRIMARY KEY,
                temperature DECIMAL(5, 2),
                light DECIMAL(5, 2),
                lux DECIMAL(5, 2) DEFAULT 0,
                recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tabla «metrics» verificada/creada');

        // Índice para metrics
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_metrics_recorded_at ON metrics(recorded_at DESC);
        `);
        console.log('✅ Índice de métricas creado');

        // Tabla: hourly_metrics
        await pool.query(`
            CREATE TABLE IF NOT EXISTS hourly_metrics (
                id SERIAL PRIMARY KEY,
                avg_temperature DECIMAL(5, 2),
                avg_light DECIMAL(5, 2),
                avg_lux DECIMAL(5, 2) DEFAULT 0,
                recorded_at TIMESTAMP WITH TIME ZONE UNIQUE NOT NULL
            );
        `);
        console.log('✅ Tabla «hourly_metrics» verificada/creada');

        // Índice para hourly_metrics
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_hourly_metrics_recorded_at ON hourly_metrics(recorded_at DESC);
        `);
        console.log('✅ Índice de métricas horarias creado');

        // Tabla: system_settings
        await pool.query(`
            CREATE TABLE IF NOT EXISTS system_settings (
                id SERIAL PRIMARY KEY,
                min_ideal_temp DECIMAL(5, 2) DEFAULT 16.0,
                max_ideal_temp DECIMAL(5, 2) DEFAULT 26.0,
                min_alert_temp DECIMAL(5, 2) DEFAULT 5.0,
                max_alert_temp DECIMAL(5, 2) DEFAULT 40.0,
                light_override_schedule_enabled BOOLEAN DEFAULT FALSE,
                light_schedule_start VARCHAR(5) DEFAULT '09:00',
                light_schedule_end VARCHAR(5) DEFAULT '21:00',
                light_override_intensity_enabled BOOLEAN DEFAULT FALSE,
                light_intensity_value INTEGER DEFAULT 100
            );
        `);
        console.log('✅ Tabla «system_settings» verificada/creada');

        // Inicializar configuración global si no existe
        await pool.query(`
            INSERT INTO system_settings (
                id, min_ideal_temp, max_ideal_temp, min_alert_temp, max_alert_temp, 
                light_override_schedule_enabled, light_schedule_start, light_schedule_end, 
                light_override_intensity_enabled, light_intensity_value
            )
            VALUES (
                1, 16.0, 26.0, 5.0, 40.0, 
                FALSE, '09:00', '21:00', 
                FALSE, 100
            )
            ON CONFLICT (id) DO NOTHING;
        `);
        console.log('✅ Configuración inicial de «system_settings» verificada');

        console.log('--- Proceso de inicialización completado con éxito ---');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error inicializando la base de datos:', error.message);
        process.exit(1);
    }
};

initDb();
