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

async function checkTableStructure() {
    try {
        const result = await pool.query(`
            SELECT 
                column_name, 
                data_type, 
                character_maximum_length,
                column_default,
                is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'usuario'
            ORDER BY ordinal_position;
        `);

        if (result.rows.length === 0) {
            console.log('La tabla "usuario" no existe en la base de datos.');
            return;
        }

        console.log('\nEstructura de la tabla usuario:');
        console.log('================================');
        result.rows.forEach(column => {
            console.log(`\nColumna: ${column.column_name}`);
            console.log(`Tipo: ${column.data_type}`);
            if (column.character_maximum_length) {
                console.log(`Longitud máxima: ${column.character_maximum_length}`);
            }
            console.log(`Permite NULL: ${column.is_nullable}`);
            if (column.column_default) {
                console.log(`Valor por defecto: ${column.column_default}`);
            }
        });

    } catch (error) {
        console.error('Error al consultar la estructura de la tabla:', error);
    } finally {
        await pool.end();
    }
}

checkTableStructure();
