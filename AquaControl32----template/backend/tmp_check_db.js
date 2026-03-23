import pool from './src/config/db.js';

async function check() {
    try {
        const res = await pool.query('SELECT count(*), min(recorded_at), max(recorded_at) FROM metrics');
        console.log('Metrics Stats:', res.rows[0]);
        
        const lastHour = await pool.query("SELECT count(*) FROM metrics WHERE recorded_at >= NOW() - INTERVAL '1 hour'");
        console.log('Data in last hour:', lastHour.rows[0].count);
        
        const last24Hours = await pool.query("SELECT count(*) FROM metrics WHERE recorded_at >= NOW() - INTERVAL '24 hours'");
        console.log('Data in last 24 hours:', last24Hours.rows[0].count);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
