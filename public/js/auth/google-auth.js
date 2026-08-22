// ============================================================
//  Iniciar sesión / registrarse con Google (Firebase Auth)
//  Se usa desde login.html y registro.html.
// ============================================================
async function iniciarSesionConGoogle(boton) {
    const textoOriginal = boton.innerHTML;
    boton.disabled = true;
    boton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Conectando...';

    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        const resultado = await firebase.auth().signInWithPopup(provider);
        const idToken = await resultado.user.getIdToken();

        const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
        });
        const data = await res.json();

        if (!res.ok) {
            mostrarErrorGoogle(data.mensaje || 'No se pudo iniciar sesión con Google');
            return;
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('rol', data.rol);
        localStorage.setItem('nombre', data.nombre || '');
        localStorage.setItem('cargo', data.cargo || '');

        if (data.rol === 'COLABORADOR') {
            window.location.href = '/dashboard.html';
            return;
        }
        const redirect = localStorage.getItem('redirectAfterLogin');
        if (redirect === 'envio') {
            localStorage.removeItem('redirectAfterLogin');
            window.location.href = '/envio.html';
        } else {
            window.location.href = '/';
        }

    } catch (err) {
        if (err.code === 'auth/popup-closed-by-user') {
            // El usuario cerró la ventana de Google: no es un error real, no mostramos nada.
        } else {
            console.error(err);
            mostrarErrorGoogle('No se pudo conectar con Google. Intenta de nuevo.');
        }
    } finally {
        boton.disabled = false;
        boton.innerHTML = textoOriginal;
    }
}

function mostrarErrorGoogle(texto) {
    const mensaje = document.getElementById('mensaje');
    if (!mensaje) { alert(texto); return; }
    mensaje.textContent = texto;
    mensaje.className = 'alert alert-danger';
    mensaje.classList.remove('d-none');
}

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btnGoogleLogin');
    if (btn) btn.addEventListener('click', () => iniciarSesionConGoogle(btn));
});
