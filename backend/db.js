import pkg from 'pg';
const { Pool } = pkg;

export const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "mpslytherin",
  password: "root",
  port: 5432,
});
