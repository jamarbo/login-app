window.onload = async () => {
  try {
    const res = await fetch("http://localhost:3000/check-connection");
    const data = await res.json();
    document.getElementById("db-status").innerText = data.message;
  } catch (e) {
    document.getElementById("db-status").innerText = "Error conectando con la base de datos";
  }
};

function showForm(form) {
  document.getElementById("login-form").classList.remove("active");
  document.getElementById("register-form").classList.remove("active");
  document.getElementById(`${form}-form`).classList.add("active");
}

async function login() {
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;

  const res = await fetch("http://localhost:3000/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  document.getElementById("login-message").innerText = data.message;
}

async function register() {
  const username = document.getElementById("register-username").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;

  const res = await fetch("http://localhost:3000/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });

  const data = await res.json();
  document.getElementById("register-message").innerText = data.message;
}
