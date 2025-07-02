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

async function verifyTables() {
    try {
        console.log('Verificando tablas y relaciones...\n');

        // 1. Verificar existencia de tablas
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('usuario', 'login_history')
            ORDER BY table_name;
        `);

        console.log('Tablas encontradas:');
        tables.rows.forEach(table => {
            console.log(`- ${table.table_name}`);
        });

        // 2. Verificar estructura de usuario
        console.log('\nEstructura de la tabla usuario:');
        const userColumns = await pool.query(`
            SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'usuario'
            ORDER BY ordinal_position;
        `);

        userColumns.rows.forEach(col => {
            console.log(`- ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
        });

        // 3. Verificar estructura de login_history
        console.log('\nEstructura de la tabla login_history:');
        const historyColumns = await pool.query(`
            SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'login_history'
            ORDER BY ordinal_position;
        `);

        historyColumns.rows.forEach(col => {
            console.log(`- ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
        });

        // 4. Verificar foreign keys
        console.log('\nVerificando foreign keys:');
        const foreignKeys = await pool.query(`
            SELECT
                tc.table_name, 
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = 'login_history';
        `);

        if (foreignKeys.rows.length > 0) {
            foreignKeys.rows.forEach(fk => {
                console.log(`- ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
            });
        } else {
            console.log('⚠️ No se encontraron foreign keys en login_history');
            
            // 5. Verificar tipos de datos de las columnas relacionadas
            const userIdType = await pool.query(`
                SELECT data_type
                FROM information_schema.columns
                WHERE table_name = 'usuario'
                AND column_name = 'id'
            `);

            const historyUserIdType = await pool.query(`
                SELECT data_type
                FROM information_schema.columns
                WHERE table_name = 'login_history'
                AND column_name = 'user_id'
            `);

            console.log('\nTipos de datos de las columnas relacionadas:');
            console.log(`- usuario.id: ${userIdType.rows[0]?.data_type}`);
            console.log(`- login_history.user_id: ${historyUserIdType.rows[0]?.data_type}`);

            // Si los tipos no coinciden, corregir
            if (userIdType.rows[0]?.data_type !== historyUserIdType.rows[0]?.data_type) {
                console.log('\n⚠️ Los tipos de datos no coinciden. Corrigiendo...');
                
                // Eliminar la tabla login_history y recrearla con el tipo correcto
                await pool.query('DROP TABLE IF EXISTS login_history;');
                await pool.query(`
                    CREATE TABLE login_history (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER REFERENCES usuario(id),
                        login_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                        success BOOLEAN,
                        ip_address VARCHAR(45)
                    );
                `);
                console.log('✅ Tabla login_history recreada con los tipos correctos');
            }
        }

    } catch (error) {
        console.error('Error durante la verificación:', error);
    } finally {
        await pool.end();
    }
}

verifyTables();
