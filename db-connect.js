import pg from 'pg';
import { config } from 'dotenv';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
config({ path: join(__dirname, '.env') });

const { Pool } = pg;

// Configuración de la conexión
const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'mpslytherin',
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: process.env.DB_SSL === 'true'
};

// Crear el pool de conexiones
const pool = new Pool(dbConfig);

// Crear interfaz para leer input del usuario
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('Conectando a PostgreSQL...');
console.log('Configuración:', {
    ...dbConfig,
    password: '****' // No mostrar la contraseña
});

async function executeQuery(query) {
    try {
        const result = await pool.query(query);
        console.log('\nResultado:');
        console.table(result.rows);
        console.log(`\n${result.rowCount} filas afectadas`);
    } catch (error) {
        console.error('Error al ejecutar la consulta:', error.message);
    }
}

// Función principal interactiva
async function main() {
    try {
        // Probar la conexión
        await pool.query('SELECT NOW()');
        console.log('\nConexión exitosa a la base de datos!');
        
        // Mostrar tablas disponibles
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        
        console.log('\nTablas disponibles:');
        tables.rows.forEach(row => console.log(`- ${row.table_name}`));

        // Función recursiva para preguntar por consultas
        const askQuery = () => {
            rl.question('\nIngresa tu consulta SQL (o "salir" para terminar):\n> ', async (query) => {
                if (query.toLowerCase() === 'salir') {
                    await pool.end();
                    rl.close();
                    return;
                }

                await executeQuery(query);
                askQuery();
            });
        };

        console.log('\nPuedes ejecutar consultas SQL. Algunos ejemplos:');
        console.log('- SELECT * FROM usuario;');
        console.log('- SELECT COUNT(*) FROM usuario;');
        console.log('- DESCRIBE usuario;');

        askQuery();

    } catch (error) {
        console.error('Error de conexión:', error.message);
        process.exit(1);
    }
}

main();
