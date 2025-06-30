import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

// Solo cargar dotenv en desarrollo
if (process.env.NODE_ENV !== 'production') {
  const dotenv = await import('dotenv');
  dotenv.config();
}
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./db.js";
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

// Log de variables de entorno (sin datos sensibles)
console.log('Ambiente:', process.env.NODE_ENV);
console.log('Puerto:', PORT);
console.log('Host BD:', process.env.DB_HOST);

// Necesario para usar __dirname con ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    await pool.query("SELECT 1");
    res.json({ message: "Conexión a la base de datos exitosa" });
  } catch {
    res.status(500).json({ message: "Error de conexión a la base de datos" });
  }
});

// Endpoint de login
app.post("/login", loginLimiter, loginValidation, validate, async (req, res) => {
  const { username, password } = req.body;
  try {
    // Primero buscamos al usuario
    const result = await pool.query(
      "SELECT * FROM usuario WHERE username = $1 AND activo = true",
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.json({ message: "Credenciales inválidas", success: false });
    }

    // Verificar contraseña
    const validPassword = await verifyPassword(password, result.rows[0].password);
    
    if (validPassword) {
      const user = result.rows[0];
      // Actualizamos la fecha de último acceso y reiniciamos intentos fallidos
      await pool.query(
        `UPDATE usuario 
         SET fecha_ultimo_acceso = CURRENT_TIMESTAMP,
             intentos_fallidos = 0,
             bloqueado_hasta = NULL
         WHERE id = $1`,
        [user.id]
      );
      
      res.cookie("user", user.id, { httpOnly: true });
      res.json({ message: "Login exitoso", success: true });
    } else {
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
    const existingUser = await pool.query(
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
    
    await pool.query(
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

app.get("/profile", async (req, res) => {
  const userId = req.cookies.user;
  if (!userId) {
    return res.status(401).json({ message: "No autenticado", success: false });
  }

  try {
    const result = await pool.query(
      `SELECT 
        id, 
        username, 
        email, 
        fecha_ultimo_acceso,
        fecha_creacion,
        activo,
        intentos_fallidos,
        bloqueado_hasta
      FROM usuario 
      WHERE id = $1 AND activo = true`,
      [userId]
    );
    if (result.rows.length > 0) {
      const user = {
        ...result.rows[0],
        estado: result.rows[0].activo ? "Activo" : "Inactivo",
        rol: "Usuario", // Por defecto todos son tipo usuario
        lastAccess: result.rows[0].fecha_ultimo_acceso // Para mantener compatibilidad con el frontend
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

// Redirigir cualquier ruta desconocida a index.html (SPA)
app.get("*", (req, res) => {
  res.redirect("/index.html");
});

// Escuchar en el puerto especificado
app.listen(PORT, () => {
  const url = process.env.NODE_ENV === 'production'
    ? 'https://login-app-nd1m.onrender.com'
    : `http://localhost:${PORT}`;
  console.log(`Servidor iniciado en ${url}`);
});
