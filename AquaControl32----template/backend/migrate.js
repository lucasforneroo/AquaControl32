import pool from './src/config/db.js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

async function migrate() {
    console.log('--- Iniciando Migración de Base de Datos ---');
    try {
        const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('Ejecutando schema.sql...');
        await pool.query(sql);
        
        console.log('✅ Migración completada exitosamente.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        process.exit(1);
    }
}

migrate();
