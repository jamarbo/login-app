import pkg from 'pg';
const { Pool } = pkg;

// Log del ambiente
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('¿Es producción?:', process.env.NODE_ENV === 'production');

const dbConfig = {
  user: process.env.NODE_ENV === 'production' ? process.env.PGUSER : process.env.DB_USER,
  host: process.env.NODE_ENV === 'production' ? process.env.PGHOST : process.env.DB_HOST,
  database: process.env.NODE_ENV === 'production' ? process.env.PGDATABASE : process.env.DB_NAME,
  password: process.env.NODE_ENV === 'production' ? process.env.PGPASSWORD : process.env.DB_PASSWORD,
  port: parseInt(process.env.NODE_ENV === 'production' ? process.env.PGPORT : process.env.DB_PORT),
  ssl: process.env.NODE_ENV === 'production' ? {
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
