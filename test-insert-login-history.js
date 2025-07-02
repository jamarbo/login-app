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

async function testInsertLoginHistory() {
    try {
        // Buscar un usuario existente
        const userRes = await pool.query('SELECT id, username FROM usuario LIMIT 1');
        if (userRes.rows.length === 0) {
            console.log('❌ No hay usuarios en la tabla usuario.');
            return;
        }
        const user = userRes.rows[0];
        console.log(`Probando con usuario: ${user.username} (id: ${user.id})`);

        // Insertar un registro de login_history
        await pool.query(`
            INSERT INTO login_history (user_id, login_time, success, ip_address)
            VALUES ($1, CURRENT_TIMESTAMP, $2, $3)
        `, [user.id, true, '127.0.0.1']);
        console.log('✅ Registro insertado en login_history');

        // Consultar los últimos registros
        const historyRes = await pool.query(`
            SELECT id, user_id, login_time, success, ip_address
            FROM login_history
            WHERE user_id = $1
            ORDER BY login_time DESC
            LIMIT 3
        `, [user.id]);
        console.log('Últimos registros de login_history para este usuario:');
        historyRes.rows.forEach(row => {
            console.log(row);
        });
    } catch (error) {
        console.error('Error en la prueba de inserción/consulta:', error);
    } finally {
        await pool.end();
    }
}

testInsertLoginHistory();
