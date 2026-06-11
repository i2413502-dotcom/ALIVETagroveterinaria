// Obtener token de la URL
const params = new URLSearchParams(window.location.search);
const token = params.get('token');

if (!token) {
    document.getElementById('formRestablecer').innerHTML = `
        <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle"></i> 
            Enlace inválido o expirado. Solicita uno nuevo.
        </div>
        <a href="/recuperar.html" class="btn btn-outline-success">Solicitar nuevo enlace</a>
    `;
}

document.getElementById('formRestablecer').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const password = document.getElementById('password').value;
    const confirmar = document.getElementById('confirmar').value;
    const mensaje = document.getElementById('mensaje');
    const btn = e.target.querySelector('button');
    
    if (password !== confirmar) {
        mensaje.className = 'alert alert-warning';
        mensaje.textContent = 'Las contraseñas no coinciden';
        mensaje.classList.remove('d-none');
        return;
    }
    
    if (password.length < 6) {
        mensaje.className = 'alert alert-warning';
        mensaje.textContent = 'La contraseña debe tener al menos 6 caracteres';
        mensaje.classList.remove('d-none');
        return;
    }
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Restableciendo...';
    
    try {
        const response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, nuevaPassword: password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mensaje.className = 'alert alert-success';
            mensaje.textContent = '¡Contraseña restablecida! Redirigiendo al login...';
            mensaje.classList.remove('d-none');
            
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        } else {
            mensaje.className = 'alert alert-danger';
            mensaje.textContent = data.mensaje || 'Error al restablecer';
            mensaje.classList.remove('d-none');
        }
    } catch (error) {
        mensaje.className = 'alert alert-danger';
        mensaje.textContent = 'Error de conexión. Intenta de nuevo.';
        mensaje.classList.remove('d-none');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-shield-check"></i> Restablecer contraseña';
    }
});