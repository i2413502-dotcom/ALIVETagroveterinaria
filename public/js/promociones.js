// Verificar si es admin
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/login.html';
}

document.getElementById('imagenPromo').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const preview = document.getElementById('previewImagen');
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            preview.src = ev.target.result;
            preview.classList.remove('d-none');
        };
        reader.readAsDataURL(file);
    } else {
        preview.classList.add('d-none');
        preview.src = '';
    }
});

document.getElementById('formPromocion').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const correo = document.getElementById('correo').value;
    const asunto = document.getElementById('asunto').value;
    const mensajeTexto = document.getElementById('mensajePromo').value;
    // Capturamos el archivo de la imagen
    const imagenInput = document.getElementById('imagenPromo').files[0]; 
    
    const mensaje = document.getElementById('mensaje');
    const btn = e.target.querySelector('button');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Enviando...';
    
    // Creamos un objeto FormData para enviar texto y archivos juntos
    const formData = new FormData();
    if (correo) formData.append('correo', correo);
    formData.append('asunto', asunto);
    formData.append('mensaje', mensajeTexto);
    
    if (imagenInput) {
        formData.append('imagen', imagenInput); // 'imagen' es la llave que recibirá tu backend
    }
    
    try {
        const response = await fetch('/api/auth/enviar-promocion', {
            method: 'POST',
            headers: {
                // 'Content-Type' SE ELIMINA AQUÍ (El navegador lo maneja automáticamente con FormData)
                'Authorization': `Bearer ${token}`
            },
            body: formData // Enviamos el formData en lugar del JSON
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mensaje.className = 'alert alert-success';
            mensaje.textContent = '¡Promoción enviada correctamente!';
            mensaje.classList.remove('d-none');
            document.getElementById('formPromocion').reset();
            document.getElementById('previewImagen').classList.add('d-none');
            document.getElementById('previewImagen').src = '';
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