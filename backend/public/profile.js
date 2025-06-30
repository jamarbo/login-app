// profile.js
window.onload = async () => {
  // Obtener datos del usuario desde el backend
  try {
    const res = await fetch("/profile", { credentials: "include" });
    if (res.status === 401) {
      window.location.href = "/";
      return;
    }
    const user = await res.json();
    // Avatar dinámico
    document.getElementById("profile-avatar").src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user.username
    )}&background=4f8cff&color=fff&size=100`;
    // Bienvenida personalizada
    document.getElementById("profile-welcome").innerText = `¡Bienvenido, ${
      user.username
    }!`;
    // Info usuario
    document.getElementById("profile-info").innerHTML = `
      <p><strong>ID:</strong> ${user.id}</p>
      <p><strong>Usuario:</strong> ${user.username}</p>
      <p><strong>Email:</strong> ${user.email}</p>
      <p><strong>Rol:</strong> ${user.rol || "Usuario"}</p>
      <p><strong>Estado:</strong> ${user.estado || "Activo"}</p>
      <p><strong>Último acceso:</strong> ${
        user.fecha_ultimo_acceso
          ? new Date(user.fecha_ultimo_acceso).toLocaleString()
          : "N/A"
      }</p>
    `;
    document.getElementById("last-login").style.display = "none";
  } catch (e) {
    document.getElementById("profile-info").innerText = "Error cargando el perfil.";
  }

  document.getElementById("logout-btn").onclick = async () => {
    await fetch("/logout", { method: "POST", credentials: "include" });
    localStorage.removeItem("lastLogin");
    window.location.href = "/";
  };

  document.getElementById("edit-btn").onclick = () => {
    alert("Funcionalidad de edición de perfil próximamente.");
  };
};
