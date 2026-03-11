-- AquaControl32 - Database Schema
-- Referencia para la creación de tablas en PostgreSQL

-- Tabla: users
-- Almacena información de usuarios autenticados con Google OAuth
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    picture TEXT,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: metrics
-- Almacena datos históricos de temperatura e iluminación del ESP32
CREATE TABLE IF NOT EXISTS metrics (
    id SERIAL PRIMARY KEY,
    temperature DECIMAL(5, 2),
    light DECIMAL(5, 2),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice para optimizar consultas por tiempo en el historial
CREATE INDEX IF NOT EXISTS idx_metrics_recorded_at ON metrics(recorded_at DESC);
