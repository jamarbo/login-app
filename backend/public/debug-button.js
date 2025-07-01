// Script independiente para añadir el botón de diagnóstico
// Este script es más simple para evitar errores

(function() {
    console.log('Inicializando debug-button.js');
    
    // Esperar a que el DOM esté cargado
    function init() {
        console.log('DOM cargado, buscando contenedor de historial');
        
        // Crear botón de diagnóstico
        const debugBtn = document.createElement('button');
        debugBtn.textContent = 'Diagnosticar Historial';
        debugBtn.className = 'btn btn-secondary';
        debugBtn.style.marginTop = '10px';
        debugBtn.style.marginBottom = '10px';
        debugBtn.style.width = '100%';
        
        // Buscar el contenedor de historial
        const historyList = document.getElementById('loginHistoryList');
        const historyContainer = document.querySelector('.login-history');
        
        if (historyContainer && historyList) {
            console.log('Elementos encontrados, añadiendo botón');
            historyContainer.appendChild(debugBtn);
            
            // Añadir el evento click
            debugBtn.addEventListener('click', async () => {
                console.log('Botón clickeado, ejecutando diagnóstico');
                historyList.innerHTML = '<p>Ejecutando diagnóstico...</p>';
                
                try {
                    // Mostrar cookies disponibles
                    const cookies = document.cookie.split(';').map(c => c.trim());
                    historyList.innerHTML += `<p>Cookies: ${cookies.join(' | ') || 'Ninguna'}</p>`;
                    
                    // Verificar endpoint con fetch directo
                    const response = await fetch(`${window.location.origin}/api/login-history`, {
                        credentials: 'include',
                        headers: {
                            'Accept': 'application/json',
                            'Cache-Control': 'no-cache'
                        }
                    });
                    
                    const text = await response.text();
                    historyList.innerHTML += `<p>Respuesta: ${response.status}</p>`;
                    
                    try {
                        // Intentar parsear como JSON
                        const data = JSON.parse(text);
                        historyList.innerHTML += '<p>Respuesta JSON válida</p>';
                        historyList.innerHTML += `<pre>${JSON.stringify(data, null, 2)}</pre>`;
                    } catch (e) {
                        // Si no es JSON, mostrar como texto
                        historyList.innerHTML += '<p style="color:red">No es JSON válido</p>';
                        historyList.innerHTML += `<pre>${text.substring(0, 200)}...</pre>`;
                    }
                } catch (error) {
                    historyList.innerHTML += `<p>Error: ${error.message}</p>`;
                }
            });
        } else {
            console.error('No se encontraron los elementos necesarios');
            
            // Crear un botón de emergencia si no se encuentran los elementos
            const emergencyBtn = document.createElement('button');
            emergencyBtn.textContent = 'Diagnóstico de Emergencia';
            emergencyBtn.style.position = 'fixed';
            emergencyBtn.style.bottom = '20px';
            emergencyBtn.style.right = '20px';
            emergencyBtn.style.zIndex = '9999';
            emergencyBtn.style.padding = '10px';
            emergencyBtn.style.backgroundColor = '#ff4444';
            emergencyBtn.style.color = 'white';
            emergencyBtn.style.border = 'none';
            emergencyBtn.style.borderRadius = '5px';
            
            emergencyBtn.addEventListener('click', () => {
                alert('Ejecutando diagnóstico de emergencia...');
                const cookies = document.cookie;
                alert(`Cookies disponibles: ${cookies || 'Ninguna'}`);
            });
            
            document.body.appendChild(emergencyBtn);
        }
    }
    
    // Si el DOM ya está listo, ejecutar directamente
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
