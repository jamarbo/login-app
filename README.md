# Login App - Sistema de Control de Tareas, Premios y Castigos

Una aplicación web moderna de inicio de sesión y gestión de usuarios construida con Node.js, Express y PostgreSQL.

## 📋 Descripción

Esta aplicación proporciona un sistema completo de autenticación de usuarios que incluye:

- **Registro de usuarios** con validación de datos
- **Inicio de sesión seguro** con autenticación basada en cookies
- **Perfiles de usuario** con soporte para avatares personalizados
- **Historial de accesos** que rastrea intentos exitosos y fallidos
- **Seguridad robusta** con hash de contraseñas y limitación de intentos
- **Interfaz responsive** adaptada para dispositivos móviles y escritorio

## 🚀 Características

### Seguridad
- Encriptación de contraseñas con bcrypt
- Limitación de intentos de login (rate limiting)
- Validación y sanitización de datos de entrada
- Gestión segura de sesiones con cookies HTTP-only
- Protección contra ataques de fuerza bruta

### Funcionalidades de Usuario
- Registro con username, email y contraseña
- Inicio de sesión con autenticación
- Perfiles personalizables con avatares
- Historial detallado de accesos con direcciones IP
- Interfaz intuitiva y moderna

### Tecnologías
- **Backend**: Node.js con Express.js
- **Base de datos**: PostgreSQL
- **Frontend**: HTML5, CSS3, JavaScript vanilla
- **Autenticación**: Cookies de sesión
- **Seguridad**: bcrypt, express-rate-limit, express-validator

## 📦 Requisitos

- **Node.js** >= 14.0.0
- **PostgreSQL** >= 12
- **npm** o **yarn**

## 🛠️ Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/jamarbo/login-app.git
cd login-app
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar la base de datos
1. Crea una base de datos PostgreSQL
2. Copia el archivo de configuración de ejemplo:
```bash
cp .env.example .env
```

### 4. Configurar variables de entorno
Edita el archivo `.env` con tus datos:

```env
# Base de datos PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tu_nombre_base_datos
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña

# Puerto de la aplicación
PORT=3000

# Secreto para cookies (genera una cadena aleatoria segura)
COOKIE_SECRET=tu_secreto_super_seguro_aqui

# Modo de la aplicación
NODE_ENV=development
```

### 5. Inicializar la base de datos
La aplicación creará automáticamente las tablas necesarias al iniciar por primera vez.

## 🎮 Uso

### Desarrollo
```bash
npm run dev
```
Esto iniciará el servidor con nodemon para reinicio automático durante el desarrollo.

### Producción
```bash
npm start
```

La aplicación estará disponible en `http://localhost:3000` (o el puerto configurado).

## 📱 Interfaz de Usuario

### Página Principal
- **Login**: Formulario de inicio de sesión
- **Registro**: Formulario de registro de nuevos usuarios
- **Validación en tiempo real** de campos de entrada

### Perfil de Usuario
- **Información personal**: username, email, fecha de creación
- **Avatar personalizable**: subida y vista previa de imagen
- **Historial de accesos**: registro de todos los intentos de login

## 🔧 Configuración Avanzada

### Base de Datos
La aplicación utiliza dos archivos de configuración de base de datos:
- `backend/db.js`: Configuración principal
- `backend/db_fixed.js`: Configuración alternativa con inicialización de tablas

### Seguridad
Configuración en `backend/utils/security.js`:
- **Rate limiting**: 10 intentos por 15 minutos
- **Validación de contraseñas**: Mínimo 6 caracteres, debe incluir mayúscula, minúscula y número
- **Validación de username**: 3-30 caracteres, solo letras, números y guiones bajos

### CORS
Por defecto configurado para:
- **Desarrollo**: `http://localhost:3000`
- **Producción**: `https://login-app-nd1m.onrender.com`

## 🚀 Despliegue

### Despliegue en Render
1. Conecta tu repositorio a Render
2. Configura las variables de entorno en el panel de Render
3. El servicio se desplegará automáticamente

### Variables de entorno para producción
```env
NODE_ENV=production
PGHOST=tu_host_postgresql
PGPORT=5432
PGDATABASE=tu_base_datos
PGUSER=tu_usuario
PGPASSWORD=tu_contraseña
COOKIE_SECRET=tu_secreto_seguro
```

## 📁 Estructura del Proyecto

```
login-app/
├── backend/
│   ├── public/           # Archivos estáticos (HTML, CSS, JS)
│   │   ├── index.html    # Página principal
│   │   ├── profile.html  # Página de perfil
│   │   ├── style.css     # Estilos principales
│   │   ├── script.js     # JavaScript principal
│   │   └── profile.js    # JavaScript del perfil
│   ├── utils/
│   │   └── security.js   # Utilidades de seguridad
│   ├── db.js            # Configuración de base de datos
│   └── server.js        # Servidor principal
├── .env.example         # Ejemplo de configuración
├── package.json         # Dependencias y scripts
└── README.md           # Este archivo
```

## 🔍 API Endpoints

### Autenticación
- `POST /login` - Iniciar sesión
- `POST /register` - Registrar nuevo usuario
- `GET /profile` - Obtener perfil del usuario
- `POST /api/upload-avatar` - Subir avatar

### Utilidades
- `GET /` - Página principal (redirige a index.html)
- `GET /check-connection` - Verificar conexión a la base de datos

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama para tu característica (`git checkout -b feature/nueva-caracteristica`)
3. Commit tus cambios (`git commit -am 'Añade nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Crea un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🆘 Soporte

Si encuentras algún problema o tienes preguntas:

1. Revisa los issues existentes en GitHub
2. Crea un nuevo issue describiendo el problema
3. Incluye información sobre tu entorno (versión de Node.js, PostgreSQL, etc.)

## 🔄 Versiones

- **v1.0.0** - Versión inicial con funcionalidades básicas de login y registro