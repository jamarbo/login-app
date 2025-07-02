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

async function createLoginHistory() {
    try {
        // Primero verificamos si la tabla existe
        const checkTable = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema='public' 
            AND table_name='login_history'
        `);

        if (checkTable.rows.length === 0) {
            console.log('Creando tabla login_history...');
            
            await pool.query(`
                CREATE TABLE login_history (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER,
                    login_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    success BOOLEAN,
                    ip_address VARCHAR(45),
                    FOREIGN KEY (user_id) REFERENCES usuario(id)
                );
            `);
            
            console.log('Tabla login_history creada exitosamente');
        } else {
            console.log('La tabla login_history ya existe');
            
            // Mostrar estructura actual de la tabla
            const columns = await pool.query(`
                SELECT column_name, data_type, character_maximum_length
                FROM information_schema.columns
                WHERE table_name = 'login_history'
                ORDER BY ordinal_position;
            `);
            
            console.log('\nEstructura actual de login_history:');
            columns.rows.forEach(col => {
                console.log(`${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

createLoginHistory();
