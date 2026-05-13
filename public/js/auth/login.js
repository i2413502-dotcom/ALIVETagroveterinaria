document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const correo = document.getElementById('correo').value.trim();
    const password = document.getElementById('password').value.trim();
    const mensaje = document.getElementById('mensaje');

    mensaje.classList.add('d-none');

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, password })
        });

        const data = await response.json();

        if (!response.ok) {
            mensaje.textContent = data.mensaje;
            mensaje.className = 'alert alert-danger';
            mensaje.classList.remove('d-none');
            return;
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('rol', data.rol);
        localStorage.setItem('nombre', data.nombre);

        // Redirigir según rol
        if (data.rol === 'COLABORADOR') {
            window.location.href = '/dashboard.html';
        } else {
            // Si venía del carrito, ir a envío
            const redirect = localStorage.getItem('redirectAfterLogin');
            if (redirect === 'envio') {
                localStorage.removeItem('redirectAfterLogin');
                window.location.href = '/envio.html';
            } else {
                window.location.href = '/';
            }
        }

    } catch (err) {
        mensaje.textContent = 'Error al conectar con el servidor';
        mensaje.className = 'alert alert-danger';
        mensaje.classList.remove('d-none');
    }
});