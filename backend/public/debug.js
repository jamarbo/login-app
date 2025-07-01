// Determinar la URL base según el ambiente - usar el origen actual 
const baseUrl = window.location.origin;
console.log('Debug: URL base utilizada:', baseUrl);

// Función para verificar las cookies
function checkCookies() {
    console.log('Cookies disponibles:', document.cookie);
    return document.cookie.split(';').map(c => c.trim());
}

// Función de depuración para historial
async function testHistoryEndpoint() {
    try {
        console.log('Debug: baseUrl =', baseUrl);
        console.log('Debug: Cookies disponibles =', document.cookie);
        
        // Primero probamos el endpoint de diagnóstico
        console.log('Probando endpoint de diagnóstico...');
        const diagnosticUrl = `${baseUrl}/api/check-history-endpoint`;
        console.log('Debug: URL completa del diagnóstico =', diagnosticUrl);
        
        const diagnosticResponse = await fetch(diagnosticUrl, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        console.log('Debug: Estado de respuesta diagnóstico =', diagnosticResponse.status);
        console.log('Debug: Headers de respuesta diagnóstico =', [...diagnosticResponse.headers.entries()]);
        
        // Manejar errores de autenticación
        if (diagnosticResponse.status === 401) {
            console.error('Error de autenticación en el diagnóstico');
            return {
                success: false,
                error: 'No autenticado (401)',
                needsLogin: true
            };
        }
        
        if (!diagnosticResponse.ok) {
            console.error('Error en endpoint de diagnóstico:', diagnosticResponse.status);
            return {
                success: false,
                error: `Error en endpoint de diagnóstico: ${diagnosticResponse.status}`
            };
        }
        
        const diagnosticData = await diagnosticResponse.json();
        console.log('Respuesta de diagnóstico:', diagnosticData);
        
        // Ahora probamos el endpoint de historial real
        console.log('Probando endpoint de historial...');
        const historyUrl = `${baseUrl}/api/login-history`;
        console.log('Debug: URL completa del historial =', historyUrl);
        
        const historyResponse = await fetch(historyUrl, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
        console.log('Debug: Estado de respuesta historial =', historyResponse.status);
        console.log('Debug: Headers de respuesta historial =', [...historyResponse.headers.entries()]);
        
        // Manejar errores de autenticación
        if (historyResponse.status === 401) {
            console.error('Error de autenticación en el historial');
            return {
                success: false,
                error: 'No autenticado (401)',
                needsLogin: true
            };
        }
        
        // Anular el anterior fetch y usar XMLHttpRequest para tener más control
        console.log('Probando endpoint de historial con XMLHttpRequest...');
        
        // Crear promesa para XMLHttpRequest
        const xhrPromise = new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', `${baseUrl}/api/login-history`);
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.setRequestHeader('Cache-Control', 'no-cache');
            xhr.withCredentials = true; // Para enviar cookies
            
            xhr.onload = function() {
                console.log('Debug XHR: status =', xhr.status);
                console.log('Debug XHR: responseType =', xhr.responseType);
                console.log('Debug XHR: Content-Type =', xhr.getResponseHeader('Content-Type'));
                
                const responseText = xhr.responseText;
                console.log('Respuesta de historial (texto XHR):', responseText.substring(0, 200));
                
                resolve(responseText);
            };
            
            xhr.onerror = function(e) {
                console.error('Error XHR:', e);
                reject(new Error('Error de red en XMLHttpRequest'));
            };
            
            xhr.send();
        });
        
        const responseText = await xhrPromise;
        
        // Intentar parsear la respuesta como JSON
        try {
            const data = JSON.parse(responseText);
            console.log('Respuesta de historial (objeto):', data);
            return {
                success: true,
                data: data
            };
        } catch (parseError) {
            console.error('Error al parsear JSON:', parseError);
            console.error('¿Es HTML?', responseText.trim().startsWith('<'));
            return {
                success: false,
                error: `Error al parsear JSON: ${parseError.message}`,
                responseText: responseText.substring(0, 200)
            };
        }
    } catch (error) {
        console.error('Error en prueba:', error);
        return {
            success: false,
            error: `Error en prueba: ${error.message}`
        };
    }
}

// Añadir botón de diagnóstico
window.addEventListener('DOMContentLoaded', () => {
    console.log('Debug: DOM Content Loaded');
    
    // Solo añadir si estamos en la página de perfil
    const historyList = document.getElementById('loginHistoryList');
    if (historyList) {
        console.log('Debug: Elemento loginHistoryList encontrado, añadiendo botón de diagnóstico');
        
        // Crear botón de diagnóstico
        const debugBtn = document.createElement('button');
        debugBtn.textContent = 'Diagnosticar Historial';
        debugBtn.className = 'btn btn-secondary';
        debugBtn.style.marginTop = '10px';
        debugBtn.style.marginBottom = '10px';
        debugBtn.style.display = 'block'; // Asegurarse de que sea visible
        
        // Añadir evento al botón
        debugBtn.addEventListener('click', async () => {
            console.log('Debug: Botón de diagnóstico clickeado');
            // Mostrar información de cookies antes de cualquier prueba
            const cookies = checkCookies();
            
            historyList.innerHTML = `
                <p class="text-center">Ejecutando diagnóstico...</p>
                <p><strong>Cookies disponibles (${cookies.length}):</strong> ${cookies.join(' | ') || 'Ninguna'}</p>
            `;
            
            // Ejecutar diagnóstico
            const result = await testHistoryEndpoint();
                
                if (result.success) {
                    historyList.innerHTML = '<p class="text-center text-success">Diagnóstico exitoso. Recargando...</p>';
                    setTimeout(() => loadLoginHistory(), 1500);
                } else {
                    historyList.innerHTML = `<p class="text-center text-error">Error de diagnóstico: ${result.error}</p>`;
                if (result.responseText) {
                    // Crear un contenedor para mostrar detalles del error
                    const details = document.createElement('div');
                    details.style.marginTop = '10px';
                    
                    // Mostrar si parece ser HTML
                    const isHtml = result.responseText.trim().startsWith('<');
                    const infoText = document.createElement('p');
                    infoText.innerHTML = isHtml ? 
                        '<strong style="color:red">La respuesta es HTML, no JSON</strong>' : 
                        '<strong>La respuesta no parece ser HTML</strong>';
                    details.appendChild(infoText);
                    
                    // Analizar el HTML para identificar redirecciones o problemas
                    if (isHtml) {
                        // Verificar si es una redirección o error de autenticación
                        const htmlAnalysis = document.createElement('p');
                        
                        if (result.responseText.includes('Redirigiendo') || 
                            result.responseText.includes('redirect')) {
                            htmlAnalysis.innerHTML = '<strong style="color:orange">Parece una redirección</strong>';
                        } else if (result.responseText.includes('login') || 
                                  result.responseText.includes('iniciar sesión')) {
                            htmlAnalysis.innerHTML = '<strong style="color:orange">Parece página de login</strong>';
                        } else if (result.responseText.includes('Error 404') || 
                                  result.responseText.includes('Not Found')) {
                            htmlAnalysis.innerHTML = '<strong style="color:orange">Error 404 - Ruta no encontrada</strong>';
                        }
                        
                        details.appendChild(htmlAnalysis);
                    }
                    
                    // Mostrar la respuesta en un pre formateado
                    const pre = document.createElement('pre');
                    pre.textContent = result.responseText;
                    pre.style.maxHeight = '200px';
                    pre.style.overflow = 'auto';
                    pre.style.whiteSpace = 'pre-wrap';
                    pre.style.background = '#222';
                    pre.style.padding = '10px';
                    pre.style.fontSize = '12px';
                    
                    // Añadir detalles de cookies
                    const cookiesInfo = document.createElement('p');
                    cookiesInfo.innerHTML = '<strong>Cookies disponibles:</strong> ' + 
                        document.cookie || 'No hay cookies';
                    cookiesInfo.style.marginTop = '10px';
                    
                    details.appendChild(pre);
                    details.appendChild(cookiesInfo);
                    historyList.appendChild(details);
                }
            }
        });
        
        // Añadir después del historial
        const historyContainer = document.querySelector('.login-history');
        if (historyContainer) {
            console.log('Debug: Contenedor de historial encontrado, añadiendo botón');
            historyContainer.appendChild(debugBtn);
        } else {
            console.error('Debug: No se encontró el contenedor .login-history');
            // Intentar añadirlo directamente después del historyList como plan B
            historyList.insertAdjacentElement('afterend', debugBtn);
        }
    } else {
        console.error('Debug: No se encontró el elemento loginHistoryList');
    }
    
    // Añadir un botón de diagnóstico directo a la página como plan C
    // Por si hay algún problema con la estructura del DOM
    setTimeout(() => {
        if (!document.querySelector('button:contains("Diagnosticar Historial")')) {
            console.log('Debug: Añadiendo botón de emergencia');
            const emergencyBtn = document.createElement('button');
            emergencyBtn.textContent = 'Diagnosticar Historial (Emergencia)';
            emergencyBtn.className = 'btn btn-danger';
            emergencyBtn.style.position = 'fixed';
            emergencyBtn.style.bottom = '20px';
            emergencyBtn.style.right = '20px';
            emergencyBtn.style.zIndex = '9999';
            
            emergencyBtn.addEventListener('click', async () => {
                alert('Ejecutando diagnóstico de emergencia...');
                const result = await testHistoryEndpoint();
                alert(JSON.stringify(result, null, 2));
            });
            
            document.body.appendChild(emergencyBtn);
        }
    }, 2000);
});
