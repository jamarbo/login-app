// Determinar la URL base según el ambiente
const baseUrl = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000'
  : 'https://login-app-nd1m.onrender.com';

window.onload = async () => {
  try {
    const response = await fetch(`${baseUrl}/profile`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      // Si no está autorizado o hay otro error, redirigir
      window.location.href = 'index.html';
      return;
    }

    const result = await response.json();

    if (result.success) {
      updateProfileUI(result.user);
      loadLoginHistory();
    } else {
      showNotification(result.message || 'Error al cargar datos.', true);
    }
  } catch (error) {
    console.error('Error al cargar el perfil:', error);
    showNotification('Error de conexión al cargar el perfil.', true);
  }

  // Configurar botón para mostrar/ocultar formulario de avatar
  document.getElementById('toggle-avatar-form').addEventListener('click', () => {
    document.getElementById('avatar-form').classList.toggle('hidden');
  });

  // Configurar el formulario de subida de avatar
  document.getElementById('avatar-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('avatar-input');
    if (!fileInput.files.length) {
      showNotification('Por favor, selecciona un archivo.', true);
      return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64String = reader.result;
      try {
        const response = await fetch(`${baseUrl}/api/upload-avatar`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatarBase64: base64String }),
        });
        const result = await response.json();
        if (response.ok && result.success) {
          showNotification('Avatar actualizado.');
          document.getElementById('profile-avatar').src = result.avatarUrl;
          document.getElementById('avatar-form').classList.add('hidden');
        } else {
          showNotification(result.message || 'Error al actualizar.', true);
        }
      } catch (error) {
        showNotification('Error de conexión.', true);
      }
    };
  });

  // Otros listeners
  document.getElementById('logout-btn').onclick = () => { window.location.href = 'logout.html'; };
  document.getElementById('diagnose-btn').addEventListener('click', () => { /* Lógica de diagnóstico */ });
};

function updateProfileUI(user) {
  if (user.avatarUrl && user.avatarUrl.startsWith('data:image')) {
    document.getElementById("profile-avatar").src = user.avatarUrl;
  } else {
    document.getElementById("profile-avatar").src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || "U")}&background=4f8cff&color=fff&size=120`;
  }

  document.getElementById("profile-welcome").textContent = `¡Bienvenido, ${user.username}!`;
  
  const infoContainer = document.getElementById("profile-info");
  infoContainer.innerHTML = `
    <p><strong>ID:</strong> <span>${user.id}</span></p>
    <p><strong>Usuario:</strong> <span>${user.username}</span></p>
    <p><strong>Email:</strong> <span>${user.email}</span></p>
    <p><strong>Rol:</strong> <span>${user.rol || 'Usuario'}</span></p>
    <p><strong>Estado:</strong> <span>${user.estado || 'Activo'}</span></p>
    <p><strong>Último acceso:</strong> <span>${user.lastAccess ? new Date(user.lastAccess).toLocaleString('es-ES') : 'N/A'}</span></p>
  `;
}

async function loadLoginHistory() {
  const historyList = document.getElementById("loginHistoryList");
  try {
    const response = await fetch(`${baseUrl}/api/login-history`, { credentials: 'include' });
    const data = await response.json();
    if (data.success && data.history.length > 0) {
      historyList.innerHTML = data.history.map(item => {
        const date = new Date(item.login_time).toLocaleString('es-ES');
        const status = item.success ? 'Exitoso' : 'Fallido';
        const statusClass = item.success ? 'text-success' : 'text-error';
        return `<div class="history-item"><span>${date}</span><span class="${statusClass}">${status}</span></div>`;
      }).join('');
    } else {
      historyList.innerHTML = `<p class="text-center">${data.message || 'No hay historial.'}</p>`;
    }
  } catch (error) {
    historyList.innerHTML = `<p class="text-center text-error">Error al cargar historial.</p>`;
  }
}

function showNotification(message, isError = false) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = 'notification show';
  if (isError) {
    notification.classList.add('error');
  }
  setTimeout(() => {
    notification.className = 'notification';
  }, 3000);
}