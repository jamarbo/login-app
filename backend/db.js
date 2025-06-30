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
      return;
    }
    console.log('Conexión a la base de datos establecida correctamente:', result.rows[0]);
  });
});
