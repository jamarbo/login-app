import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'mpslytherin',
    password: process.env.DB_PASSWORD || 'root',
    port: process.env.DB_PORT || 5432
};

const pool = new Pool(dbConfig);

async function verifyLoginHistoryFK() {
    try {
        // Verificar existencia de la tabla
        const table = await pool.query(`
            SELECT table_name FROM information_schema.tables WHERE table_name = 'login_history';
        `);
        if (table.rows.length === 0) {
            console.log('❌ La tabla login_history NO existe');
            return;
        } else {
            console.log('✅ La tabla login_history existe');
        }

        // Verificar foreign key
        const fk = await pool.query(`
            SELECT
                tc.constraint_name, tc.table_name, kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_name = 'login_history';
        `);
        if (fk.rows.length === 0) {
            console.log('❌ La tabla login_history NO tiene foreign key');
        } else {
            fk.rows.forEach(row => {
                console.log(`✅ FK: ${row.table_name}.${row.column_name} -> ${row.foreign_table_name}.${row.foreign_column_name}`);
            });
        }
    } catch (error) {
        console.error('Error verificando la tabla login_history:', error);
    } finally {
        await pool.end();
    }
}

verifyLoginHistoryFK();
