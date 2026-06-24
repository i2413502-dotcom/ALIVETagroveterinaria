// ============================================================
//  FLUJO 1: Enlace de recuperación por correo
// ============================================================
document.getElementById('formEnlace').addEventListener('submit', async (e) => {
    e.preventDefault();
    const correo = document.getElementById('correoEnlace').value.trim();
    const alerta = document.getElementById('mensajeEnlace');
    const btn = e.target.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Enviando...';

    try {
        const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo })
        });
        const data = await res.json();

        mostrarAlerta(alerta, 'success',
            '<i class="bi bi-envelope-check me-1"></i>' + data.mensaje);
        e.target.reset();
    } catch {
        mostrarAlerta(alerta, 'danger', 'Error de conexión. Intenta de nuevo.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-envelope-arrow-up me-1"></i>Obtener enlace de recuperación';
    }
});


// ============================================================
//  FLUJO 2: Código OTP
// ============================================================
let pendingId = null;
let correoGuardado = null;

// Paso 1 — solicitar código
document.getElementById('formSolicitarCodigo').addEventListener('submit', async (e) => {
    e.preventDefault();
    correoGuardado = document.getElementById('correoOtp').value.trim();
    const alerta = document.getElementById('mensajeCodigo');
    const btn = e.target.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Enviando...';

    try {
        const res = await fetch('/api/auth/forgot-password-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo: correoGuardado })
        });
        const data = await res.json();

        if (!res.ok) {
            mostrarAlerta(alerta, 'danger', data.mensaje || 'Error al enviar código.');
            return;
        }

        pendingId = data.pendingId;

        // Mostrar paso 2
        document.getElementById('stepCorreo').classList.add('d-none');
        document.getElementById('stepRestablecer').classList.remove('d-none');
        ocultarAlerta(alerta);

    } catch {
        mostrarAlerta(alerta, 'danger', 'Error de conexión. Intenta de nuevo.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-send me-1"></i>Enviar código';
    }
});

// Paso 2 — restablecer con OTP
document.getElementById('formRestablecerOtp').addEventListener('submit', async (e) => {
    e.preventDefault();
    const alerta = document.getElementById('mensajeCodigo');
    const btn = e.target.querySelector('button[type="submit"]');

    const otp = document.getElementById('codigoOtp').value.trim();
    const nuevaPassword = document.getElementById('nuevaPassword').value;
    const confirmarPassword = document.getElementById('confirmarPassword').value;
    const ultimaPassword = document.getElementById('ultimaPassword').value;

    if (!/^\d{6}$/.test(otp)) {
        mostrarAlerta(alerta, 'warning', 'El código debe tener exactamente 6 dígitos.');
        return;
    }
    if (nuevaPassword !== confirmarPassword) {
        mostrarAlerta(alerta, 'warning', 'Las contraseñas no coinciden.');
        return;
    }
    if (nuevaPassword.length < 6) {
        mostrarAlerta(alerta, 'warning', 'La contraseña debe tener al menos 6 caracteres.');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Restableciendo...';

    try {
        const body = { pendingId, otp, nuevaPassword };
        if (ultimaPassword.trim()) body.ultimaPassword = ultimaPassword;

        const res = await fetch('/api/auth/reset-password-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();

        if (res.ok) {
            mostrarAlerta(alerta, 'success',
                '<i class="bi bi-check-circle me-1"></i>¡Contraseña restablecida! Redirigiendo...');
            setTimeout(() => { window.location.href = '/login.html'; }, 2000);
        } else {
            mostrarAlerta(alerta, 'danger', data.mensaje || 'Error al restablecer la contraseña.');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-shield-check me-1"></i>Restablecer contraseña';
        }
    } catch {
        mostrarAlerta(alerta, 'danger', 'Error de conexión. Intenta de nuevo.');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-shield-check me-1"></i>Restablecer contraseña';
    }
});

// Reenviar código
document.getElementById('btnReenviar').addEventListener('click', async () => {
    const alerta = document.getElementById('mensajeCodigo');
    const btn = document.getElementById('btnReenviar');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Reenviando...';

    try {
        const res = await fetch('/api/auth/forgot-password-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo: correoGuardado })
        });
        const data = await res.json();
        pendingId = data.pendingId;
        mostrarAlerta(alerta, 'info',
            '<i class="bi bi-arrow-clockwise me-1"></i>Nuevo código enviado. Revisa tu correo.');
    } catch {
        mostrarAlerta(alerta, 'danger', 'Error al reenviar. Intenta de nuevo.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i>Reenviar código';
    }
});


// ============================================================
//  Helpers
// ============================================================
function mostrarAlerta(el, tipo, html) {
    el.className = `alert alert-${tipo}`;
    el.innerHTML = html;
    el.classList.remove('d-none');
}
function ocultarAlerta(el) {
    el.classList.add('d-none');
}
