import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { pool } from "./db.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get("/check-connection", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ message: "Conexión a la base de datos exitosa" });
  } catch {
    res.status(500).json({ message: "Error de conexión a la base de datos" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      "SELECT * FROM public.usuario WHERE username = $1 AND password = $2",
      [username, password]
    );

    if (result.rows.length > 0) {
      res.json({ message: "Login exitoso" });
    } else {
      res.json({ message: "Login fallido" });
    }
  } catch {
    res.status(500).json({ message: "Error al procesar login" });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
