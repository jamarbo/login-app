// CORREGIDO: Se usa window.location.origin para que la URL sea siempre correcta.
const baseUrl = window.location.origin;

// --- ELEMENTOS DEL DOM ---
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const profileSection = document.getElementById('profile-section');

// Determinar la URL base según el ambiente
// const baseUrl = window.location.hostname === 'localhost' 
//   ? 'http://localhost:3000'
//   : 'https://login-app-nd1m.onrender.com';

async function updateStatus() {
  const element = document.getElementById('db-status'); // O el ID que corresponda
  try {
    const response = await fetch(`${baseUrl}/check-connection`);
    const data = await response.json();
    if (element) { // <-- AÑADIR ESTA COMPROBACIÓN
      element.innerText = data.message;
      element.style.color = data.success ? 'lightgreen' : 'salmon';
    }
  } catch (error) {
    if (element) { // <-- AÑADIR ESTA COMPROBACIÓN
      element.innerText = 'Error conectando con el servidor.';
      element.style.color = 'red';
    }
    console.error('Error al verificar la conexión:', error);
  }
}

window.onload = () => {
  updateStatus();
};

document.addEventListener("DOMContentLoaded", () => {
  const showRegisterLink = document.getElementById("show-register");
  const showLoginLink = document.getElementById("show-login");

  // Mostrar el formulario de login por defecto y ocultar los demás
  loginForm.style.display = "block";
  registerForm.style.display = "none";
  profileSection.style.display = "none";

  showRegisterLink.addEventListener("click", (e) => {
    e.preventDefault();
    loginForm.style.display = "none";
    registerForm.style.display = "block";
    profileSection.style.display = "none";
  });

  showLoginLink.addEventListener("click", (e) => {
    e.preventDefault();
    loginForm.style.display = "block";
    registerForm.style.display = "none";
    profileSection.style.display = "none";
  });
});

document.addEventListener("DOMContentLoaded", () => {
  // Manejador para la subida de avatar en el registro
  const registerAvatarInput = document.getElementById('register-avatar-input');
  const registerAvatarPreview = document.getElementById('register-avatar-preview');
  const registerAvatarBase64 = document.getElementById('register-avatar-base64');

  registerAvatarInput.addEventListener('change', () => {
    const file = registerAvatarInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target.result;
        registerAvatarPreview.src = base64String;
        registerAvatarBase64.value = base64String;
      };
      reader.readAsDataURL(file);
    }
  });
});

async function login() {
  const usernameInput = document.getElementById("login-username");
  const passwordInput = document.getElementById("login-password");
  const username = usernameInput.value;
  const password = passwordInput.value;

  showLoading("login-message");

  try {
    const res = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    
    if (data.success) {
      // Guardar datos del usuario en sessionStorage para uso inmediato
      sessionStorage.setItem('userData', JSON.stringify(data.user));
      updateStatus("login-message", "Login exitoso, redirigiendo...", "success");
      setTimeout(() => {
        window.location.href = "/profile.html";
      }, 1000);
    } else {
      updateStatus("login-message", data.message, "error");
      usernameInput.value = "";
      passwordInput.value = "";
    }
  } catch (e) {
    console.error("Error al iniciar sesión:", e);
    console.log("Error al iniciar sesión:", e);
    // Manejo de errores al iniciar sesión    
    updateStatus("login-message", "Error al iniciar sesión", "error");
    usernameInput.value = "";
    passwordInput.value = "";
  }
}

async function register() {
  const username = document.getElementById("register-username").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;
  const avatarBase64 = document.getElementById("register-avatar-base64").value;

  showLoading("register-message");

  try {
    const response = await fetch(`${baseUrl}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, avatarBase64 }),
    });

    const result = await response.json();
    updateStatus("register-message", result.message, result.success ? "success" : "error");
  } catch (e) {
    updateStatus("register-message", "Error al registrar usuario", "error");
  }
}

function showLoading(elementId) {
  const element = document.getElementById(elementId);
  element.innerHTML = '<div class="spinner"></div> Procesando...';
  element.className = "loading";
}

function updateStatus(elementId, message, status) {
  const element = document.getElementById(elementId);
  element.innerText = message;
  element.className = status;
}