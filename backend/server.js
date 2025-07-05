import express from "express";
import cors from "cors";
// import bodyParser from "body-parser"; // No es necesario
// import multer from "multer"; // <-- ELIMINAR
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as db from "./db.js";
import cookieParser from "cookie-parser";
import { 
  loginLimiter,  
  hashPassword, 
  verifyPassword, 
  registerValidation, 
  loginValidation, 
  validate 
} from './utils/security.js';

const app = express();

// Configurar Express para confiar en proxies (importante para rate limiting en producción)
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3000;

// Necesario para usar __dirname con ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- INICIO: Toda esta sección de Multer ha sido eliminada ---
// El código de configuración de multer, avatarStorage y upload se ha quitado.
// --- FIN: Toda esta sección de Multer ha sido eliminada ---

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://login-app-nd1m.onrender.com'
    : 'http://localhost:3000',
  credentials: true
}));
app.use(cookieParser(process.env.COOKIE_SECRET));

// CORREGIDO: Usa solo express.json con el límite aumentado.
// Asegúrate de que esta línea esté ANTES de tus rutas.
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// Servir archivos estáticos desde /backend/public
app.use(express.static(path.join(__dirname, "public")));

// Redirigir la raíz a index.html
app.get("/", (req, res) => {
  res.redirect("/index.html");
});

// Endpoint para verificar conexión a la base de datos
app.get("/check-connection", async (req, res) => {
  try {
    // Verificar conexión a la base de datos
    const dbResult = await db.pool.query("SELECT 1 as connection_test");
    
    // Verificar qué tablas existen
    const tables = await db.pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    // Obtener el nombre de la tabla de usuarios
    const userTableName = await db.getUserTableName();
    
    // Verificar si la tabla login_history existe
    const historyTableExists = tables.rows.some(row => row.table_name === 'login_history');
    
    res.json({ 
      message: "Conexión a la base de datos exitosa",
      tables: tables.rows.map(row => row.table_name),
      userTable: userTableName,
      loginHistoryExists: historyTableExists,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error al verificar la conexión:", error);
    res.status(500).json({ message: "Error al verificar la conexión" });
  }
});

// Endpoint de login
app.post("/login", loginLimiter, loginValidation, validate, async (req, res) => {
  const { username, password } = req.body;
  let user = null;
  
  try {
    const tableName = await db.getUserTableName();
    const result = await db.pool.query(
      `SELECT * FROM ${tableName} WHERE username = $1 AND activo = true`,
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.json({ message: "Credenciales inválidas", success: false });
    }

    // Verificar contraseña
    user = result.rows[0];
    const validPassword = await verifyPassword(password, user.password);
    
    if (validPassword) {
      // Actualizamos la fecha de último acceso y reiniciamos intentos fallidos
      await db.pool.query(
        `UPDATE ${tableName} 
         SET fecha_ultimo_acceso = CURRENT_TIMESTAMP,
             intentos_fallidos = 0,
             bloqueado_hasta = NULL
         WHERE id = $1`,
        [user.id]
      );
      
      // Registrar acceso exitoso en historial
      await db.addLoginHistory(user.id, true, req.ip);
      
      res.cookie("user", user.id, { httpOnly: true });
      res.json({ message: "Login exitoso", success: true });
    } else {
      // Registrar intento fallido en historial
      await db.addLoginHistory(user.id, false, req.ip);
      
      res.json({ message: "Login fallido", success: false });
    }
  } catch (error) {
    console.error("Error en la consulta de login:", error);
    res.status(500).json({ message: "Error al procesar login" });
  }
});

app.post("/register", registerValidation, validate, async (req, res) => {
  const { username, email, password, avatarBase64 } = req.body;
  try {
    const tableName = await db.getUserTableName();
    // Verificar si el usuario o email ya existe
    const existingUser = await db.pool.query(
      `SELECT username, email FROM ${tableName} WHERE username = $1 OR email = $2`,
      [username, email]
    );
    
    if (existingUser.rows.length > 0) {
      const field = existingUser.rows[0].username === username ? "username" : "email";
      return res.status(400).json({ 
        message: `El ${field} ya está registrado`,
        success: false
      });
    }

    // Hash de la contraseña
    const hashedPassword = await hashPassword(password);
    
    // MODIFICADO: Se añade avatar_base64 al INSERT
    await db.pool.query(
      `INSERT INTO ${tableName} (
        username, 
        email, 
        password, 
        fecha_creacion,
        activo,
        intentos_fallidos,
        bloqueado_hasta,
        avatar_base64
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, true, 0, NULL, $4)`,
      [username, email, hashedPassword, avatarBase64 || null] // Se usa null si no se envía avatar
    );
    res.json({ message: "Registro exitoso", success: true });
  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).json({ message: "Error en el registro" });
  }
});

// Endpoint para obtener datos del perfil del usuario
app.get("/profile", async (req, res) => {
  const userId = req.cookies.user;

  if (!userId) {
    // Si no hay cookie de usuario, no está autorizado
    return res.status(401).json({ message: "No autorizado: Inicie sesión" });
  }

  try {
    const tableName = await db.getUserTableName();
    // 1. Obtener los datos principales del usuario
    const userResult = await db.pool.query(
      `SELECT id, username, email, fecha_creacion, avatar_base64 
       FROM ${tableName} WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const userProfile = userResult.rows[0];

    // 2. Obtener el historial de login del usuario usando la función de db.js
    const history = await db.getLoginHistory(userId);

    // 3. Enviar ambos resultados al cliente
    res.json({
      profile: userProfile,
      history: history
    });

  } catch (error) {
    console.error("Error al obtener el perfil:", error);
    res.status(500).json({ message: "Error del servidor al obtener el perfil" });
  }
});

// Endpoint para actualizar el avatar del usuario
app.post("/api/upload-avatar", async (req, res) => {
  const userId = req.cookies.user;
  const { avatarBase64 } = req.body;

  if (!userId) {
    return res.status(401).json({ message: "No autorizado", success: false });
  }

  if (!avatarBase64 || !avatarBase64.startsWith('data:image')) {
    return res.status(400).json({ message: "Formato de imagen no válido.", success: false });
  }

  try {
    const tableName = await db.getUserTableName();
    await db.pool.query(
      `UPDATE ${tableName} SET avatar_base64 = $1 WHERE id = $2`,
      [avatarBase64, userId]
    );
    res.json({ 
      message: "Avatar actualizado correctamente.", 
      success: true,
      avatarUrl: avatarBase64 
    });
  } catch (error) {
    console.error("Error al actualizar el avatar:", error);
    res.status(500).json({ message: "Error del servidor al actualizar el avatar.", success: false });
  }
});

// --- INICIO: Rutas de ejemplo (puedes eliminar o modificar) ---
app.get("/api/ejemplo", (req, res) => {
  res.json({ message: "¡Hola, mundo!" });
});
// --- FIN: Rutas de ejemplo ---

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
