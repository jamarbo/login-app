import pkg from 'pg';
const { Pool } = pkg;

// Log del ambiente
const isProduction = process.env.NODE_ENV === 'production';
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('¿Es producción?:', isProduction);
console.log('Variables de entorno disponibles:', {
  PGUSER: process.env.PGUSER,
  PGHOST: process.env.PGHOST,
  PGDATABASE: process.env.PGDATABASE,
  PGPORT: process.env.PGPORT,
  // No loggeamos PGPASSWORD por seguridad
});

const dbConfig = {
  user: isProduction ? process.env.PGUSER : (process.env.DB_USER || 'postgres'),
  host: isProduction ? process.env.PGHOST : (process.env.DB_HOST || 'localhost'),
  database: isProduction ? process.env.PGDATABASE : (process.env.DB_NAME || 'mpslytherin'),
  password: isProduction ? process.env.PGPASSWORD : (process.env.DB_PASSWORD || 'root'),
  port: isProduction ? process.env.PGPORT : (process.env.DB_PORT || 5432),
  ssl: isProduction ? { rejectUnauthorized: false } : false
};

// Log de configuración (sin mostrar la contraseña)
console.log('Configuración BD:', {
  ...dbConfig,
  password: '****' // No mostrar la contraseña en logs
});

console.log('Ambiente:', process.env.NODE_ENV || 'development');
console.log('Puerto:', process.env.PORT || 3000);
console.log('Host BD:', dbConfig.host);

export const pool = new Pool(dbConfig);

// Verificar conexión
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err.message);
    return;
  }
  client.query('SELECT NOW()', (err, result) => {
    release();
    if (err) {
      console.error('Error al ejecutar consulta de prueba:', err.message);
      console.log('Error al ejecutar consulta de prueba:', err.message);

      return;
    }
    console.log('Conexión a la base de datos establecida correctamente:', result.rows[0]);
  });
});

// Consultas para el manejo del perfil
export const updateUserProfile = async (userId, { username, email, fullName }) => {
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    if (username) {
        updateFields.push(`username = $${paramCount}`);
        values.push(username);
        paramCount++;
    }
    if (email) {
        updateFields.push(`email = $${paramCount}`);
        values.push(email);
        paramCount++;
    }
    if (fullName) {
        updateFields.push(`full_name = $${paramCount}`);
        values.push(fullName);
        paramCount++;
    }

    if (updateFields.length === 0) return null;

    values.push(userId);
    const query = `
        UPDATE users 
        SET ${updateFields.join(', ')} 
        WHERE id = $${paramCount} 
        RETURNING id, username, email, full_name, ultimo_acceso, avatar_url`;

    const result = await pool.query(query, values);
    return result.rows[0];
};

export const updateUserPassword = async (userId, hashedPassword) => {
    const query = 'UPDATE users SET password = $1 WHERE id = $2';
    await pool.query(query, [hashedPassword, userId]);
};

export const updateUserAvatar = async (userId, avatarUrl) => {
    const query = 'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING avatar_url';
    const result = await pool.query(query, [avatarUrl, userId]);
    return result.rows[0];
};

export const addLoginHistory = async (userId, success, ip) => {
    const query = `
        INSERT INTO login_history (user_id, login_time, success, ip_address)
        VALUES ($1, CURRENT_TIMESTAMP, $2, $3)
        RETURNING id`;
    try {
        const result = await pool.query(query, [userId, success, ip]);
        console.log(`Registro de login guardado con ID ${result.rows[0].id}`);
        return result.rows[0].id;
    } catch (error) {
        console.error("Error al guardar historial de login:", error);
        throw error;
    }
};

export const getLoginHistory = async (userId) => {
    const query = `
        SELECT login_time, success, ip_address
        FROM login_history
        WHERE user_id = $1
        ORDER BY login_time DESC
        LIMIT 10`;
    const result = await pool.query(query, [userId]);
    return result.rows;
};

// Función para inicializar las tablas
export const initializeTables = async () => {
    try {
        // Primero verificamos qué tablas existen
        console.log('Verificando tablas existentes...');
        const existingTables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        
        const tableNames = existingTables.rows.map(row => row.table_name);
        console.log('Tablas existentes:', tableNames);
        
        // Determinar si usamos 'users' o 'usuario'
        let userTableName = 'users';
        if (tableNames.includes('usuario')) {
            userTableName = 'usuario';
            console.log('Se usará la tabla "usuario" existente');
        }
        
        // Crear tabla de usuarios si no existe
        if (!tableNames.includes(userTableName)) {
            console.log(`Creando tabla ${userTableName}...`);
            await pool.query(`
                CREATE TABLE ${userTableName} (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(30) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    full_name VARCHAR(100),
                    avatar_url TEXT,
                    fecha_ultimo_acceso TIMESTAMP WITH TIME ZONE,
                    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    intentos_fallidos INTEGER DEFAULT 0,
                    bloqueado_hasta TIMESTAMP WITH TIME ZONE,
                    activo BOOLEAN DEFAULT TRUE
                )
            `);
        } else {
            // Añadir columnas que podrían faltar a la tabla existente
            console.log(`Verificando columnas de la tabla ${userTableName}...`);
            
            // Verificar qué columnas existen
            const columnsInfo = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = $1
            `, [userTableName]);
            
            const existingColumns = columnsInfo.rows.map(row => row.column_name);
            console.log(`Columnas existentes en ${userTableName}:`, existingColumns);
            
            // Añadir columnas faltantes
            const requiredColumns = {
                'full_name': 'VARCHAR(100)',
                'avatar_url': 'TEXT',
                'fecha_ultimo_acceso': 'TIMESTAMP WITH TIME ZONE',
                'fecha_creacion': 'TIMESTAMP WITH TIME ZONE',
                'intentos_fallidos': 'INTEGER DEFAULT 0',
                'bloqueado_hasta': 'TIMESTAMP WITH TIME ZONE',
                'activo': 'BOOLEAN DEFAULT TRUE'
            };
            
            for (const [column, type] of Object.entries(requiredColumns)) {
                if (!existingColumns.includes(column)) {
                    try {
                        console.log(`Añadiendo columna ${column} a ${userTableName}...`);
                        await pool.query(`ALTER TABLE ${userTableName} ADD COLUMN ${column} ${type}`);
                    } catch (err) {
                        console.error(`Error al añadir columna ${column}:`, err.message);
                    }
                }
            }
        }
        
        // Verificar si la tabla login_history existe y su estructura
        console.log('Verificando tabla login_history...');
        if (tableNames.includes('login_history')) {
            // Verificar la relación con la tabla de usuarios
            try {
                const constraints = await pool.query(`
                    SELECT
                        tc.constraint_name,
                        tc.table_name,
                        kcu.column_name,
                        ccu.table_name AS foreign_table_name,
                        ccu.column_name AS foreign_column_name
                    FROM
                        information_schema.table_constraints tc
                        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
                    WHERE
                        tc.constraint_type = 'FOREIGN KEY'
                        AND tc.table_name = 'login_history'
                `);
                
                console.log('Restricciones de login_history:', constraints.rows);
                
                let needToRecreate = false;
                if (constraints.rows.length === 0) {
                    console.log('La tabla login_history no tiene restricciones de clave foránea');
                    needToRecreate = true;
                } else {
                    const constraint = constraints.rows[0];
                    if (constraint.foreign_table_name !== userTableName) {
                        console.log(`La restricción apunta a ${constraint.foreign_table_name}, no a ${userTableName}`);
                        needToRecreate = true;
                    }
                }
                
                if (needToRecreate) {
                    console.log('Recreando tabla login_history...');
                    await pool.query('DROP TABLE IF EXISTS login_history');
                }
            } catch (err) {
                console.error('Error al verificar restricciones:', err);
            }
        }
        
        // Crear tabla login_history si no existe o se eliminó
        console.log(`Creando o verificando tabla login_history con referencia a ${userTableName}(id)...`);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS login_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES ${userTableName}(id) ON DELETE CASCADE,
                login_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                success BOOLEAN,
                ip_address VARCHAR(45)
            )
        `);
        
        console.log('Tablas inicializadas correctamente');
        
        // Verificar si hay datos en la tabla login_history
        const historyCount = await pool.query('SELECT COUNT(*) FROM login_history');
        console.log(`La tabla login_history contiene ${historyCount.rows[0].count} registros`);
    } catch (error) {
        console.error('Error al inicializar tablas:', error);
        throw error;
    }
};

// Función para testear la conexión
export const testConnection = async () => {
    try {
        const result = await pool.query('SELECT NOW()');
        console.log('Conexión a la base de datos exitosa:', result.rows[0]);
        return true;
    } catch (error) {
        console.error('Error al conectar con la base de datos:', error);
        return false;
    }
};
