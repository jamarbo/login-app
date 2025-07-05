// Determinar la URL base según el ambiente
const baseUrl = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000'
  : 'https://tu-app.onrender.com'; // Reemplaza con tu URL de Render

document.addEventListener('DOMContentLoaded', () => {
  loadProfile();

  document.getElementById('logout-btn').addEventListener('click', logout);
  
  document.getElementById('toggle-avatar-form').addEventListener('click', () => {
    document.getElementById('avatar-form').classList.toggle('hidden');
  });

  document.getElementById('avatar-form').addEventListener('submit', uploadAvatar);
});

async function loadProfile() {
  try {
    const response = await fetch(`${baseUrl}/profile`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      window.location.href = 'index.html';
      return;
    }

    const data = await response.json();

    if (data.profile) {
      updateProfileUI(data.profile);
    } else {
      showNotification('No se pudieron cargar los datos del perfil.', true);
      return;
    }

    const historyList = document.getElementById('loginHistoryList'); // CORREGIDO
    historyList.innerHTML = '';

    if (data.history && data.history.length > 0) {
      data.history.forEach(item => {
        const listItem = document.createElement('li');
        
        // CORRECCIÓN: Manejar el caso en que login_time sea nulo
        const date = item.login_time 
          ? new Date(item.login_time).toLocaleString('es-ES') 
          : 'Fecha no disponible';
          
        const status = item.success ? 'Exitoso' : 'Fallido';
        const statusClass = item.success ? 'success' : 'failed';

        listItem.innerHTML = `
          <div class="history-item">
            <span>${date}</span>
            <span class="status ${statusClass}">${status}</span>
            <span>IP: ${item.ip_address}</span>
          </div>
        `;
        historyList.appendChild(listItem);
      });
    } else {
      historyList.innerHTML = '<li>No hay historial de accesos.</li>';
    }

  } catch (error) {
    console.error('Error al cargar el perfil:', error);
    showNotification('Error de conexión al cargar el perfil.', true);
  }
}

function updateProfileUI(user) {
  const avatarSrc = user.avatar_base64 && user.avatar_base64.startsWith('data:image')
    ? user.avatar_base64
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || "U")}&background=4f8cff&color=fff&size=120`;
  
  document.getElementById("profile-avatar").src = avatarSrc;
  document.getElementById("profile-welcome").textContent = `¡Bienvenido, ${user.username}!`;
  
  const infoContainer = document.getElementById("profile-info");
  infoContainer.innerHTML = `
    <p><strong>Usuario:</strong> <span>${user.username}</span></p>
    <p><strong>Email:</strong> <span>${user.email}</span></p>
    <p><strong>Miembro desde:</strong> <span>${new Date(user.fecha_creacion).toLocaleDateString('es-ES')}</span></p>
  `;
}

async function uploadAvatar(e) {
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
}

async function logout() {
  // Lógica para invalidar la cookie en el servidor si es necesario
  // Por ahora, solo redirigimos
  window.location.href = 'index.html';
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