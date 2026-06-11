document.getElementById('formRecuperar').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const correo = document.getElementById('correo').value;
    const mensaje = document.getElementById('mensaje');
    const btn = e.target.querySelector('button');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Enviando...';
    
    try {
        const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo })
        });
        
        const data = await response.json();
        
        mensaje.className = 'alert alert-success';
        mensaje.textContent = data.mensaje;
        mensaje.classList.remove('d-none');
        
        document.getElementById('formRecuperar').reset();
    } catch (error) {
        mensaje.className = 'alert alert-danger';
        mensaje.textContent = 'Error de conexión. Intenta de nuevo.';
        mensaje.classList.remove('d-none');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-envelope"></i> Enviar enlace de recuperación';
    }
});