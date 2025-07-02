import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
dotenv.config();

const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'mpslytherin',
    password: process.env.DB_PASSWORD || 'root',
    port: process.env.DB_PORT || 5432
};

const pool = new Pool(dbConfig);

async function testLoginAndHistory() {
    try {
        console.log('Iniciando prueba de login y registro de accesos...\n');

        // 1. Crear un usuario de prueba
        const testUsername = 'usuario_prueba_' + Date.now();
        const testPassword = 'Test1234';
        const testEmail = `${testUsername}@test.com`;

        // Hash de la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(testPassword, salt);

        console.log('Creando usuario de prueba...');
        // Generar un ID único
        const testId = Math.floor(Math.random() * 1000000) + 1;
        
        const insertUserResult = await pool.query(`
            INSERT INTO usuario (id, username, email, password, fecha_creacion, activo)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, true)
            RETURNING id, username
        `, [testId, testUsername, testEmail, hashedPassword]);

        const userId = insertUserResult.rows[0].id;
        console.log(`✅ Usuario creado - ID: ${userId}, Username: ${testUsername}\n`);

        // 2. Simular un intento de login fallido
        console.log('Simulando intento de login fallido...');
        await pool.query(`
            INSERT INTO login_history (user_id, login_time, success, ip_address)
            VALUES ($1, CURRENT_TIMESTAMP, false, '127.0.0.1')
        `, [userId]);
        console.log('✅ Intento fallido registrado\n');

        // 3. Simular un login exitoso
        console.log('Simulando login exitoso...');
        await pool.query(`
            INSERT INTO login_history (user_id, login_time, success, ip_address)
            VALUES ($1, CURRENT_TIMESTAMP, true, '127.0.0.1')
        `, [userId]);
        console.log('✅ Login exitoso registrado\n');

        // 4. Verificar el historial de accesos
        console.log('Consultando historial de accesos:');
        const historyResult = await pool.query(`
            SELECT 
                lh.login_time,
                lh.success,
                lh.ip_address,
                u.username
            FROM login_history lh
            JOIN usuario u ON u.id = lh.user_id
            WHERE u.id = $1
            ORDER BY lh.login_time DESC
        `, [userId]);

        console.log('\nHistorial de accesos para el usuario:');
        historyResult.rows.forEach(entry => {
            console.log(`- ${entry.login_time.toLocaleString()}: ${entry.success ? 'Exitoso ✅' : 'Fallido ❌'} desde ${entry.ip_address}`);
        });

        // 5. Limpiar datos de prueba
        console.log('\nLimpiando datos de prueba...');
        await pool.query('DELETE FROM login_history WHERE user_id = $1', [userId]);
        await pool.query('DELETE FROM usuario WHERE id = $1', [userId]);
        console.log('✅ Datos de prueba eliminados');

    } catch (error) {
        console.error('Error durante la prueba:', error);
    } finally {
        await pool.end();
    }
}

testLoginAndHistory();
