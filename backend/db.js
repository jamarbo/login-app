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
  // Llamamos a la función para asegurar que la tabla exista
  ensureUsersTableExists(); 
  release();
});

// --- NUEVA FUNCIÓN ---
// Esta función crea la tabla 'users' si no existe
async function ensureUsersTableExists() {
  const createTableQuery = `
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

  try {
    await pool.query(createTableQuery);
    console.log("Tabla 'users' verificada/creada exitosamente.");
  } catch (err) {
    console.error("Error al crear la tabla 'users':", err);
    // Si la creación de la tabla falla, es un error crítico, así que cerramos el proceso.
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
