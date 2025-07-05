// Determinar la URL base según el ambiente
const baseUrl = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000'
  : 'https://login-app-nd1m.onrender.com';

window.onload = async () => {
  try {
    const res = await fetch(`${baseUrl}/check-connection`);
    const data = await res.json();
    updateStatus("db-status", data.message, "success");
  } catch (e) {
    console.error("Error conectando con la base de datos:", e);
    updateStatus("db-status", "Error conectando con la base de datos", "error");
  }
};

function showForm(form) {
  document.getElementById("login-form").classList.remove("active");
  document.getElementById("register-form").classList.remove("active");
  document.getElementById(`${form}-form`).classList.add("active");
}

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

  showLoading("register-message");

  try {
    const response = await fetch(`${baseUrl}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
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