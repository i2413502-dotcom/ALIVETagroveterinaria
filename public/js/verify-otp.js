const pendingId = localStorage.getItem('pendingId');

async function verifyOtp() {
    const otp = document.getElementById('otp').value;
    const msg = document.getElementById('mensaje');

    if (!otp || otp.length !== 6) {
        msg.innerHTML = '<span class="text-danger">Ingresa un código válido de 6 dígitos</span>';
        return;
    }

    try {
        const res = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pendingId, otp })
        });
        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('rol', data.rol);
            localStorage.setItem('nombre', data.nombre);
            window.location.href = '/index.html';
        } else {
            msg.innerHTML = `<span class="text-danger">${data.mensaje}</span>`;
        }
    } catch (err) {
        msg.innerHTML = '<span class="text-danger">Error de conexión</span>';
    }
}

function reenviar() {
    window.history.back();
}

// ═══════════════════════════════════════════════════
//  DESPACHADOR DE EVENTOS (mismo patrón que dashboard.js/index.js)
// ═══════════════════════════════════════════════════
document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-accion]');
    if (!el) return;

    switch (el.dataset.accion) {
        case 'verificar-otp': verifyOtp(); break;
        case 'reenviar-otp':  reenviar(); break;
    }
});
