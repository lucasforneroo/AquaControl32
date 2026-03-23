const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: 'postgresql://postgres:Lucas2012@localhost:5432/aquacontrol'
});

async function run() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'database', 'schema.sql'), 'utf8');
        await pool.query(sql);
        console.log('Schema executed successfully.');
    } catch (e) {
        console.error('Error executing schema:', e);
    } finally {
        pool.end();
    }
}

run();
