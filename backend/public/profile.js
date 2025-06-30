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
      <p><strong>ID:</strong> <span>${user.id || "-"}</span></p>
      <p><strong>Usuario:</strong> <span>${user.username || "-"}</span></p>
      <p><strong>Email:</strong> <span>${user.email || "-"}</span></p>
      <p><strong>Rol:</strong> <span>${user.rol || "Usuario"}</span></p>
      <p><strong>Estado:</strong> <span>${user.estado || "Activo"}</span></p>
      <p><strong>Último acceso:</strong> <span>${
        user.fecha_ultimo_acceso ? new Date(user.fecha_ultimo_acceso).toLocaleString() : "N/A"
      }</span></p>
    `;
    
    document.getElementById("profile-info").innerHTML = infoHTML;
    console.log("UI actualizada exitosamente");
  } catch (e) {
    console.error("Error al actualizar la UI:", e);
  }
}

// Prevenir que los botones se disparen múltiples veces
let isProcessing = false;

document.getElementById("logout-btn").onclick = async () => {
  if (isProcessing) return;
  isProcessing = true;
  
  try {
    sessionStorage.removeItem("userData");
    await fetch("/logout", {
      method: "POST",
      credentials: "include",
    });
    window.location.href = "/";
  } catch (e) {
    console.error("Error al cerrar sesión:", e);
    isProcessing = false;
  }
};

document.getElementById("edit-btn").onclick = () => {
  if (isProcessing) return;
  alert("Funcionalidad de edición de perfil próximamente.");
};
