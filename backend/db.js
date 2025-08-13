import pkg from 'pg';
const { Pool } = pkg;

const isProduction = process.env.NODE_ENV === 'production';

const dbConfig = {
  user: isProduction ? process.env.PGUSER : 'postgres',
  host: isProduction ? process.env.PGHOST : 'localhost',
  database: isProduction ? process.env.PGDATABASE : 'mpslytherin',
  password: isProduction ? process.env.PGPASSWORD : 'root',
  port: parseInt(isProduction ? process.env.PGPORT : '5432', 10),
  ssl: isProduction ? { rejectUnauthorized: false } : false
};

console.log('DB Config:', { ...dbConfig, password: '****' });

export const pool = new Pool(dbConfig);

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error al conectar con la base de datos:', err);
  }
  // CORRECCIÓN: Llamamos a la nueva función
  ensureTablesExist(); 
  release();
});

// CORRECCIÓN: La función ahora crea ambas tablas
async function ensureTablesExist() {
  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      fecha_ultimo_acceso TIMESTAMP WITH TIME ZONE,
      activo BOOLEAN DEFAULT true,
      intentos_fallidos INTEGER DEFAULT 0,
      bloqueado_hasta TIMESTAMP WITH TIME ZONE,
      avatar_base64 TEXT
    );
  `;

  const createLoginHistoryTableQuery = `
    CREATE TABLE IF NOT EXISTS login_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      success BOOLEAN NOT NULL,
      ip_address VARCHAR(50),
      login_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pool.query(createUsersTableQuery);
    console.log("Tabla 'users' verificada/creada exitosamente.");
    await pool.query(createLoginHistoryTableQuery);
    console.log("Tabla 'login_history' verificada/creada exitosamente.");
  } catch (err) {
    console.error("Error al crear las tablas:", err);
    process.exit(1);
  }
}

export async function getUserTableName() {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'usuario'
    );
  `);
  return result.rows[0].exists ? 'usuario' : 'users';
}

export async function addLoginHistory(userId, success, ipAddress) {
  try {
    const tableName = await getUserTableName();
    await pool.query(
      `INSERT INTO login_history (user_id, success, ip_address, login_time) 
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [userId, success, ipAddress]
    );
  } catch (error) {
    console.error("Error al registrar historial de login:", error);
  }
}

export async function getLoginHistory(userId, limit = 10) {
  try {
    const result = await pool.query(`
      SELECT id, login_time, success, ip_address
      FROM login_history 
      WHERE user_id = $1 
      ORDER BY login_time DESC
      LIMIT $2
    `, [userId, limit]);
    return result.rows;
  } catch (error) {
    console.error('Error al obtener historial de accesos:', error);
    throw error;
  }
}
