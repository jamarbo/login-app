// Determinar la URL base según el ambiente
const baseUrl = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000'
  : 'https://login-app-nd1m.onrender.com';

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
    const res = await fetch(`${baseUrl}/profile`, {
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

  // Cargar historial de accesos
  await loadLoginHistory();

  // Configurar el toggle del formulario de avatar
  document.getElementById('toggle-avatar-form').addEventListener('click', () => {
    const form = document.getElementById('avatar-form');
    form.classList.toggle('visible');
  });

  // Configurar el formulario de subida de avatar
  document.getElementById('avatar-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('avatar-input');
    if (!fileInput.files.length) {
      showNotification('Por favor seleccione una imagen', true);
      return;
    }
    
    const file = fileInput.files[0];
    if (file.size > 2 * 1024 * 1024) { // 2MB max
      showNotification('La imagen es demasiado grande. Máximo 2MB', true);
      return;
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      showNotification('Subiendo avatar...');
      
      const response = await fetch(`${baseUrl}/api/upload-avatar`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Actualizar la imagen del avatar con un parámetro de timestamp para evitar caché
        document.getElementById('profile-avatar').src = `${result.avatarUrl}?t=${Date.now()}`;
        showNotification('Avatar actualizado correctamente');
        
        // Ocultar el formulario
        document.getElementById('avatar-form').classList.remove('visible');
        // Limpiar el input
        fileInput.value = '';
      } else {
        showNotification(result.message || 'Error al subir avatar', true);
      }
    } catch (error) {
      console.error('Error al subir avatar:', error);
      showNotification('Error de conexión al subir avatar', true);
    }
  });
};

function updateProfileUI(user) {
  console.log("Actualizando UI con datos:", user);
  
  try {
    // Actualizar avatar si existe una URL personalizada
    if (user.avatarUrl) {
      document.getElementById("profile-avatar").src = user.avatarUrl;
    } else {
      // Usar avatar generado si no hay personalizado
      document.getElementById("profile-avatar").src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
        user.username || "Usuario"
      )}&background=4f8cff&color=fff&size=100`;
    }

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
    
    // Cargar el historial de accesos
    loadLoginHistory();
  } catch (e) {
    console.error("Error al actualizar la UI:", e);
  }
}

// Función para cargar el historial de accesos
async function loadLoginHistory() {
  const historyList = document.getElementById('loginHistoryList');
  if (!historyList) return;
  
  historyList.innerHTML = '<p class="text-center">Cargando historial...</p>';
  
  try {
    const response = await fetch(`${baseUrl}/api/login-history`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!data.success) {
      historyList.innerHTML = `<p class="text-center text-error">${data.error || 'Error al cargar historial'}</p>`;
      return;
    }
    
    if (!data.history || !data.history.length) {
      historyList.innerHTML = '<p class="text-center">No hay registros de acceso</p>';
      return;
    }
    
    // Mostrar historial
    let historyHTML = '';
    data.history.forEach(item => {
      const date = new Date(item.login_time).toLocaleString();
      const status = item.success ? 
        '<span class="text-success">Exitoso</span>' : 
        '<span class="text-error">Fallido</span>';
      
      historyHTML += `
        <div class="history-item">
          <span>${date}</span>
          <span>${status}</span>
        </div>
      `;
    });
    
    historyList.innerHTML = historyHTML;
  } catch (error) {
    console.error('Error al cargar historial:', error);
    historyList.innerHTML = `<p class="text-center text-error">Error: ${error.message}</p>`;
  }
}

// Función para mostrar notificaciones
function showNotification(message, isError = false) {
  const notification = document.getElementById('notification');
  if (!notification) return;
  
  notification.textContent = message;
  notification.style.backgroundColor = isError ? '#ff6b6b' : '#4caf50';
  notification.style.display = 'block';
  
  setTimeout(() => {
    notification.style.display = 'none';
  }, 3000);
}

// Configurar el botón de diagnóstico
document.getElementById('diagnose-btn').addEventListener('click', async () => {
  const historyList = document.getElementById('loginHistoryList');
  historyList.innerHTML = '<p class="text-center">Ejecutando diagnóstico...</p>';
  
  try {
    // Mostrar cookies disponibles
    const cookies = document.cookie.split(';').map(c => c.trim());
    historyList.innerHTML += `<p><strong>Cookies disponibles (${cookies.length}):</strong> ${cookies.join(' | ') || 'Ninguna'}</p>`;
    
    // Verificar conexión primero
    const checkResponse = await fetch(`${baseUrl}/check-connection`);
    const checkData = await checkResponse.json();
    
    historyList.innerHTML += `
      <p><strong>Conexión a BD:</strong> ${checkData.message}</p>
      <p><strong>Tablas disponibles:</strong> ${checkData.tables ? checkData.tables.join(', ') : 'No hay información'}</p>
    `;
    
    // Probar el endpoint de historial
    try {
      const response = await fetch(`${baseUrl}/api/login-history`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      const responseText = await response.text();
      
      try {
        // Intentar parsear como JSON
        const data = JSON.parse(responseText);
        historyList.innerHTML += `
          <p class="text-success"><strong>✓ Respuesta JSON válida</strong></p>
          <pre style="max-height:150px;overflow:auto;background:#222;padding:10px;font-size:12px;">
${JSON.stringify(data, null, 2)}
          </pre>
        `;
        
        // Recargar el historial después de un diagnóstico exitoso
        setTimeout(() => loadLoginHistory(), 3000);
      } catch (parseError) {
        // Si no es JSON válido, mostrar el texto
        historyList.innerHTML += `
          <p class="text-error"><strong>✗ Respuesta no es JSON válido</strong></p>
          <p><strong>Status:</strong> ${response.status}</p>
          <p><strong>Content-Type:</strong> ${response.headers.get('Content-Type')}</p>
          <pre style="max-height:150px;overflow:auto;background:#222;padding:10px;font-size:12px;">
${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}
          </pre>
        `;
      }
    } catch (error) {
      historyList.innerHTML += `<p class="text-error"><strong>Error en petición:</strong> ${error.message}</p>`;
    }
  } catch (error) {
    console.error('Error durante diagnóstico:', error);
    historyList.innerHTML += `<p class="text-error"><strong>Error:</strong> ${error.message}</p>`;
  }
});

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
