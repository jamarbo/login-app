import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
// Importamos multer para manejar la subida de archivos
import multer from "multer";
import fs from "fs";

// Solo cargar dotenv en desarrollo
if (process.env.NODE_ENV !== 'production') {
  const dotenv = await import('dotenv');
  dotenv.config();
}
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
const PORT = process.env.PORT || 3000;

// Necesario para usar __dirname con ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear la carpeta de avatares si no existe
const avatarDir = path.join(__dirname, 'public', 'avatars');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

// Configuración para multer (subida de archivos)
const avatarStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const avatarDir = path.join(__dirname, 'public', 'avatars');
    cb(null, avatarDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, req.user.id + extension); // Usa el ID del usuario como nombre
  }
});

const upload = multer({ 
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // Límite de 2MB
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten imágenes (jpg, jpeg, png, gif)'));
  }
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://login-app-nd1m.onrender.com'
    : 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

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
    // Primero buscamos al usuario
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
  const { id, username, email, password } = req.body;
  try {
    // Verificar si el usuario o email ya existe
    const existingUser = await db.pool.query(
      "SELECT username, email FROM usuario WHERE username = $1 OR email = $2",
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
    
    await db.pool.query(
      `INSERT INTO usuario (
        id, 
        username, 
        email, 
        password, 
        fecha_creacion,
        activo,
        intentos_fallidos,
        bloqueado_hasta
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, true, 0, NULL)`,
      [id, username, email, hashedPassword]
    );
    res.json({ message: "Registro exitoso", success: true });
  } catch (error) {
    console.error("Error en registro:", error);
    if (error.constraint === 'usuario_username_key') {
      res.status(400).json({ message: "El nombre de usuario ya existe", success: false });
    } else if (error.constraint === 'usuario_email_key') {
      res.status(400).json({ message: "El email ya está registrado", success: false });
    } else {
      res.status(500).json({ message: "Error al registrar usuario", success: false });
    }
  }
});

// Endpoint para modificar el endpoint /profile y añadir avatar_url
app.get("/profile", async (req, res) => {
  const userId = req.cookies.user;
  if (!userId) {
    return res.status(401).json({ message: "No autenticado", success: false });
  }

  try {
    const result = await db.pool.query(
      `SELECT 
        id, 
        username, 
        email, 
        fecha_ultimo_acceso,
        fecha_creacion,
        activo,
        intentos_fallidos,
        bloqueado_hasta,
        avatar_url
      FROM usuario 
      WHERE id = $1 AND activo = true`,
      [userId]
    );
    if (result.rows.length > 0) {
      const user = {
        ...result.rows[0],
        estado: result.rows[0].activo ? "Activo" : "Inactivo",
        rol: "Usuario", // Por defecto todos son tipo usuario
        lastAccess: result.rows[0].fecha_ultimo_acceso, // Para mantener compatibilidad con el frontend
        avatarUrl: result.rows[0].avatar_url // Añadimos la URL del avatar
      };
      res.json({ success: true, user });
    } else {
      res.status(404).json({ message: "Usuario no encontrado", success: false });
    }
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    res.status(500).json({ message: "Error al obtener perfil" });
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("user");
  res.json({ message: "Logout exitoso" });
});

// 🧩 Esta es la línea que debes agregar para servir /login
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const token = req.cookies.user;
  if (!token) {
    return res.status(401).json({ message: "No autenticado" });
  }
  req.user = { id: token }; // En este caso simple, el token es el ID del usuario
  next();
};

// Endpoint para obtener historial de accesos
app.get('/api/login-history', authenticateToken, async (req, res) => {
  try {
    // Asegurarnos de enviar JSON
    res.setHeader('Content-Type', 'application/json');
    
    const userId = req.user.id;
    console.log(`Obteniendo historial para usuario ID: ${userId}`);
    
    // Verificar si el usuario existe
    const userTableName = await db.getUserTableName();
    const userCheck = await db.pool.query(`SELECT id FROM ${userTableName} WHERE id = $1`, [userId]);
    
    if (userCheck.rows.length === 0) {
      console.log(`Usuario con ID ${userId} no encontrado`);
      return res.json({
        success: false,
        message: 'Usuario no encontrado',
        history: []
      });
    }
    
    // Obtener el historial
    const history = await db.getLoginHistory(userId, 10);
    console.log(`Se encontraron ${history.length} registros de historial`);
    
    // Formatear las fechas para JSON
    const formattedHistory = history.map(item => ({
      ...item,
      login_time: item.login_time instanceof Date ? item.login_time.toISOString() : item.login_time
    }));
    
    res.json({
      success: true,
      history: formattedHistory
    });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.json({
      success: false,
      message: 'Error al obtener historial',
      error: error.message,
      history: []
    });
  }
});

// Endpoint de diagnóstico para verificar API de historial
app.get('/api/check-history-endpoint', authenticateToken, (req, res) => {
  res.json({
    success: true,
    userId: req.user.id,
    message: 'Endpoint de diagnóstico funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Endpoint para subir avatar
app.post('/api/upload-avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No se ha subido ningún archivo' 
      });
    }
    
    // La ruta del avatar relativa a la carpeta public
    const avatarUrl = `/avatars/${req.file.filename}`;
    
    // Actualizar la URL del avatar en la base de datos
    await db.updateUserAvatar(req.user.id, avatarUrl);
    
    res.json({ 
      success: true, 
      message: 'Avatar actualizado correctamente',
      avatarUrl: avatarUrl
    });
  } catch (error) {
    console.error('Error al subir avatar:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error al subir avatar' 
    });
  }
});

// Inicializar la base de datos al inicio
(async () => {
  try {
    const connected = await db.testConnection();
    if (connected) {
      console.log('Conexión a la base de datos exitosa');
      await db.initializeTables();
      console.log('Tablas inicializadas correctamente');
    } else {
      console.error('No se pudo establecer conexión con la base de datos');
    }
  } catch (error) {
    console.error('Error al inicializar tablas:', error);
  }
})();

// Redirigir cualquier ruta desconocida a index.html (SPA)
app.get("*", (req, res) => {
  res.redirect("/index.html");
});

// Escuchar en el puerto especificado
const server = app.listen(PORT, () => {
  const url = process.env.NODE_ENV === 'production'
    ? 'https://login-app-nd1m.onrender.com'
    : `http://localhost:${PORT}`;
  console.log(`Servidor iniciado en ${url}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`El puerto ${PORT} está en uso. Intentando otro puerto...`);
    server.close();
    app.listen(0, () => {
      console.log(`Servidor iniciado en http://localhost:${server.address().port}`);
    });
  } else {
    console.error('Error al iniciar el servidor:', err);
  }
});
