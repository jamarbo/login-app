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
  database: isProduction ? 'mpslytherin' : (process.env.DB_NAME || 'mpslytherin'),
  password: isProduction ? process.env.PGPASSWORD : (process.env.DB_PASSWORD || 'root'),
  port: parseInt(isProduction ? process.env.PGPORT : (process.env.DB_PORT || '5432')),
  ssl: isProduction ? {
    rejectUnauthorized: false
  } : false
};

// Log de configuración (sin mostrar la contraseña)
console.log('Configuración BD:', {
  user: dbConfig.user,
  host: dbConfig.host,
  database: dbConfig.database,
  port: dbConfig.port,
  ssl: dbConfig.ssl,
  password: '****'
});

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

// Inicializar tablas
export async function initializeTables() {
  try {
    // Crear tabla usuario si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuario (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        fecha_ultimo_acceso TIMESTAMP WITH TIME ZONE,
        activo BOOLEAN DEFAULT true,
        intentos_fallidos INTEGER DEFAULT 0,
        bloqueado_hasta TIMESTAMP WITH TIME ZONE
      )
    `);
    
    // Crear tabla de historial de accesos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS login_history (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES usuario(id),
        login_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN NOT NULL,
        ip_address VARCHAR(45)
      )
    `);
    
    console.log('Tablas inicializadas correctamente');
  } catch (error) {
    console.error('Error al inicializar tablas:', error);
    throw error;
  }
}

// Verificar conexión a la base de datos
export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error en test de conexión:', error);
    return false;
  }
}

// Función para obtener el nombre de la tabla de usuarios (usuario o users)
export async function getUserTableName() {
  try {
    // Primero intentamos con 'usuario'
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'usuario'
      );
    `);
    
    if (result.rows[0].exists) {
      return 'usuario';
    }
    
    // Si no existe, intentamos con 'users'
    const result2 = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (result2.rows[0].exists) {
      return 'users';
    }
    
    // Si no existe ninguna, usamos el default
    return 'usuario';
  } catch (error) {
    console.error('Error al detectar tabla de usuarios:', error);
    return 'usuario'; // Default
  }
}

// Función para registrar acceso en el historial
export async function addLoginHistory(userId, success, ipAddress) {
  try {
    // Verificar primero si el usuario existe
    const tableName = await getUserTableName();
    const userCheck = await pool.query(`SELECT id FROM ${tableName} WHERE id = $1`, [userId]);
    
    if (userCheck.rows.length === 0) {
      console.error(`No se puede registrar historial: Usuario ${userId} no encontrado en tabla ${tableName}`);
      return false;
    }
    
    // Registrar en historial
    await pool.query(`
      INSERT INTO login_history (user_id, success, ip_address)
      VALUES ($1, $2, $3)
    `, [userId, success, ipAddress]);
    
    console.log(`Historial registrado para ${userId} - ${success ? 'Exitoso' : 'Fallido'}`);
    return true;
  } catch (error) {
    console.error('Error al registrar historial de acceso:', error);
    // Si el error es que no existe la tabla, intentamos crearla
    if (error.code === '42P01') { // undefined_table
      try {
        console.log('Intentando crear tabla login_history...');
        await pool.query(`
          CREATE TABLE IF NOT EXISTS login_history (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255) REFERENCES usuario(id),
            login_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            success BOOLEAN NOT NULL,
            ip_address VARCHAR(45)
          )
        `);
        // Intentar registrar nuevamente
        await pool.query(`
          INSERT INTO login_history (user_id, success, ip_address)
          VALUES ($1, $2, $3)
        `, [userId, success, ipAddress]);
        
        return true;
      } catch (retryError) {
        console.error('Error al crear tabla de historial:', retryError);
        return false;
      }
    }
    return false;
  }
}

// Función para obtener historial de accesos
export async function getLoginHistory(userId, limit = 10) {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        login_time,
        success,
        ip_address
      FROM login_history 
      WHERE user_id = $1 
      ORDER BY login_time DESC 
      LIMIT $2
    `, [userId, limit]);
    
    return result.rows;
  } catch (error) {
    console.error('Error al obtener historial de accesos:', error);
    return [];
  }
}
