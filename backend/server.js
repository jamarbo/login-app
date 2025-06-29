import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./db.js";

const app = express();
const PORT = 3000;

// Necesario para usar __dirname con ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(bodyParser.json());

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
    const result = await pool.query(
      "SELECT * FROM usuario WHERE username = $1 AND password = $2",
      [username, password]
    );
    if (result.rows.length > 0) {
      res.json({ message: "Login exitoso" });
    } else {
      res.json({ message: "Login fallido" });
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
      `INSERT INTO usuario (id, username, email, password) VALUES ($1, $2, $3, $4)`,
      [id, username, email, password]
    );
    res.json({ message: "Registro exitoso" });
  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).json({ message: "Error al registrar usuario" });
  }
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
