// profile.js
window.onload = async () => {
  // Intentar mostrar datos inmediatamente desde sessionStorage
  const storedData = sessionStorage.getItem("userData");
  if (storedData) {
    try {
      const user = JSON.parse(storedData);
      console.log("Datos desde sessionStorage:", user);
      updateProfileUI(user);
    } catch (e) {
      console.error("Error al parsear datos de sessionStorage:", e);
    }
  }

  // Verificar sesión con el servidor
  try {
    console.log("Solicitando datos al servidor...");
    const res = await fetch("/profile", {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    console.log("Estado de la respuesta:", res.status);
    if (res.status === 401) {
      console.log("Usuario no autenticado, redirigiendo...");
      window.location.href = "/";
      return;
    }

    const data = await res.json();
    console.log("Datos recibidos del servidor:", data);

    if (data && data.success && data.user) {
      updateProfileUI(data.user);
      // Actualizar datos en sessionStorage
      sessionStorage.setItem("userData", JSON.stringify(data.user));
    } else {
      console.error("Datos incompletos o error:", data);
      document.getElementById("profile-info").innerText = "No se encontró información de usuario.";
      setTimeout(() => (window.location.href = "/"), 2000);
    }
  } catch (e) {
    console.error("Error al cargar el perfil:", e);
    document.getElementById("profile-info").innerText = "Error cargando el perfil.";
  }
};

function updateProfileUI(user) {
  console.log("Actualizando UI con datos:", user);
  
  try {
    document.getElementById("profile-avatar").src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user.username || "Usuario"
    )}&background=4f8cff&color=fff&size=100`;

    document.getElementById("profile-welcome").innerText = `¡Bienvenido${
      user.username ? ", " + user.username : ""
    }!`;

    const infoHTML = `
      <p><strong>ID:</strong> ${user.id || "-"}</p>
      <p><strong>Usuario:</strong> ${user.username || "-"}</p>
      <p><strong>Email:</strong> ${user.email || "-"}</p>
      <p><strong>Rol:</strong> ${user.rol || "Usuario"}</p>
      <p><strong>Estado:</strong> ${user.estado || "Activo"}</p>
      <p><strong>Último acceso:</strong> ${
        user.fecha_ultimo_acceso ? new Date(user.fecha_ultimo_acceso).toLocaleString() : "N/A"
      }</p>
    `;
    
    document.getElementById("profile-info").innerHTML = infoHTML;
    console.log("UI actualizada exitosamente");
  } catch (e) {
    console.error("Error al actualizar la UI:", e);
  }
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
