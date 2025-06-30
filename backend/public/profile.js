// profile.js
window.onload = async () => {
  // Intentar mostrar datos inmediatamente desde sessionStorage
  const storedData = sessionStorage.getItem("userData");
  if (storedData) {
    const user = JSON.parse(storedData);
    updateProfileUI(user);
  }

  // Verificar sesión con el servidor
  try {
    const res = await fetch("/profile", {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (res.status === 401) {
      window.location.href = "/";
      return;
    }

    const data = await res.json();
    if (data && data.success && data.user) {
      updateProfileUI(data.user);
      // Actualizar datos en sessionStorage
      sessionStorage.setItem("userData", JSON.stringify(data.user));
    } else {
      document.getElementById("profile-info").innerText =
        "No se encontró información de usuario.";
      setTimeout(() => (window.location.href = "/"), 2000);
    }
  } catch (e) {
    console.error("Error al cargar el perfil:", e);
    document.getElementById("profile-info").innerText = "Error cargando el perfil.";
  }
};

function updateProfileUI(user) {
  document.getElementById("profile-avatar").src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    user.username || "Usuario"
  )}&background=4f8cff&color=fff&size=100`;

  document.getElementById("profile-welcome").innerText = `¡Bienvenido${
    user.username ? ", " + user.username : ""
  }!`;

  document.getElementById("profile-info").innerHTML = `
    <p><strong>ID:</strong> ${user.id || "-"}</p>
    <p><strong>Usuario:</strong> ${user.username || "-"}</p>
    <p><strong>Email:</strong> ${user.email || "-"}</p>
    <p><strong>Rol:</strong> ${user.rol || "Usuario"}</p>
    <p><strong>Estado:</strong> ${user.estado || "Activo"}</p>
    <p><strong>Último acceso:</strong> ${
      user.last_access ? new Date(user.last_access).toLocaleString() : "N/A"
    }</p>
  `;
}

document.getElementById("logout-btn").onclick = async () => {
  sessionStorage.removeItem("userData");
  await fetch("/logout", {
    method: "POST",
    credentials: "include",
  });
  window.location.href = "/";
};

document.getElementById("edit-btn").onclick = () => {
  alert("Funcionalidad de edición de perfil próximamente.");
};
