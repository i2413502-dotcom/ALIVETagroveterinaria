// Verificar si es admin
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/login.html';
}

document.getElementById('formPromocion').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const correo = document.getElementById('correo').value;
    const asunto = document.getElementById('asunto').value;
    const mensajeTexto = document.getElementById('mensaje').value;
    const mensaje = document.getElementById('mensaje');
    const btn = e.target.querySelector('button');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Enviando...';
    
    try {
        const response = await fetch('/api/auth/enviar-promocion', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                correo: correo || undefined,
                asunto,
                mensaje: mensajeTexto
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mensaje.className = 'alert alert-success';
            mensaje.textContent = '¡Promoción enviada correctamente!';
            mensaje.classList.remove('d-none');
            document.getElementById('formPromocion').reset();
        } else {
            mensaje.className = 'alert alert-danger';
            mensaje.textContent = data.mensaje || 'Error al enviar promoción';
            mensaje.classList.remove('d-none');
        }
    } catch (error) {
        mensaje.className = 'alert alert-danger';
        mensaje.textContent = 'Error de conexión. Intenta de nuevo.';
        mensaje.classList.remove('d-none');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-send"></i> Enviar promoción';
    }
});