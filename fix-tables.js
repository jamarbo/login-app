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

async function fixTables() {
    try {
        // 1. Eliminar la tabla login_history si existe
        await pool.query('DROP TABLE IF EXISTS login_history');
        
        // 2. Verificar el tipo de la columna id en la tabla usuario
        const userIdType = await pool.query(`
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'usuario' AND column_name = 'id'
        `);
        
        console.log('Tipo actual de la columna id en usuario:', userIdType.rows[0]?.data_type);

        // 3. Modificar la columna id de usuario a INTEGER si es necesario
        if (userIdType.rows[0]?.data_type !== 'integer') {
            console.log('Modificando la columna id de usuario a INTEGER...');
            
            // Crear una tabla temporal con la estructura correcta
            await pool.query(`
                CREATE TABLE usuario_temp (
                    id INTEGER PRIMARY KEY,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    fecha_ultimo_acceso TIMESTAMP,
                    activo BOOLEAN DEFAULT true,
                    intentos_fallidos INTEGER DEFAULT 0,
                    bloqueado_hasta TIMESTAMP,
                    recordar_sesion BOOLEAN DEFAULT false
                )
            `);

            // Copiar los datos convirtiendo el id a INTEGER
            await pool.query(`
                INSERT INTO usuario_temp (
                    id, username, email, password, 
                    fecha_creacion, fecha_ultimo_acceso, 
                    activo, intentos_fallidos, bloqueado_hasta, 
                    recordar_sesion
                )
                SELECT 
                    CAST(id AS INTEGER), username, email, password,
                    fecha_creacion, fecha_ultimo_acceso,
                    activo, intentos_fallidos, bloqueado_hasta,
                    recordar_sesion
                FROM usuario
            `);

            // Eliminar la tabla original y renombrar la temporal
            await pool.query('DROP TABLE usuario CASCADE');
            await pool.query('ALTER TABLE usuario_temp RENAME TO usuario');
        }

        // 4. Crear la tabla login_history con la referencia correcta
        await pool.query(`
            CREATE TABLE login_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES usuario(id),
                login_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                success BOOLEAN,
                ip_address VARCHAR(45)
            )
        `);

        console.log('Tablas corregidas exitosamente');

    } catch (error) {
        console.error('Error al corregir las tablas:', error);
    } finally {
        await pool.end();
    }
}

fixTables();
