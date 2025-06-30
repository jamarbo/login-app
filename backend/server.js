import 'dotenv/config';
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./db.js";
import cookieParser from "cookie-parser";

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
    ? process.env.RENDER_EXTERNAL_URL 
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
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    // Primero verificamos las credenciales
    const result = await pool.query(
      "SELECT * FROM usuario WHERE username = $1 AND password = $2 AND activo = true",
      [username, password]
    );
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      // Actualizamos la fecha de último acceso
      await pool.query(
        "UPDATE usuario SET fecha_ultimo_acceso = CURRENT_TIMESTAMP WHERE id = $1",
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

app.post("/register", async (req, res) => {
  const { id, username, email, password } = req.body;
  try {
    await pool.query(
      `INSERT INTO usuario (
        id, 
        username, 
        email, 
        password, 
        fecha_creacion,
        activo
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, true)`,
      [id, username, email, password]
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

// Escuchar en el puerto 3000
app.listen(PORT, () => {
  console.log(`Servidor iniciado en  http://localhost:${PORT}/index.html`);
});
