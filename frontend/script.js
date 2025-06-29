window.onload = async () => {
  try {
    const res = await fetch("http://localhost:3000/check-connection");
    const data = await res.json();
    document.getElementById("db-status").innerText = data.message;
  } catch (e) {
    document.getElementById("db-status").innerText = "Error conectando con la base de datos";
  }
};

async function login() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const response = await fetch("http://localhost:3000/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const result = await response.json();
  document.getElementById("login-message").innerText = result.message;
}
