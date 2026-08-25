// Se utiliza para el móvil (mismo flujo que la app): login en dos
// pasos para colaboradores — código OTP de 5 dígitos en cada
// ingreso. Un cliente de la tienda sigue entrando directo, sin
// ningún paso extra.

let pendingLoginId = null;
let correoActual = null;

const loginForm = document.getElementById('loginForm');
const otpForm    = document.getElementById('otpForm');
const mensaje     = document.getElementById('mensaje');

function mostrarError(texto) {
    mensaje.textContent = texto;
    mensaje.className = 'alert alert-danger';
    mensaje.classList.remove('d-none');
}

function ocultarError() {
    mensaje.classList.add('d-none');
}

// ── Validación en vivo: ¿existe una cuenta con este correo? ──
// Solo informativo (no bloquea el envío del formulario) — si el
// correo no está registrado, sugiere crear cuenta en vez de dejar
// que la persona se quede intentando adivinar su contraseña.
(function validarCorreoEnVivo() {
    const correoInputEl = document.getElementById('correo');
    const aviso = document.getElementById('correo-no-registrado');
    if (!correoInputEl || !aviso) return;

    let debounceCorreo;
    correoInputEl.addEventListener('input', () => {
        clearTimeout(debounceCorreo);
        aviso.classList.add('d-none');
        debounceCorreo = setTimeout(async () => {
            if (!correoInputEl.value.includes('@')) return;
            try {
                const res = await fetch(`/api/auth/correo-registrado?correo=${encodeURIComponent(correoInputEl.value.trim())}`);
                const data = await res.json();
                aviso.classList.toggle('d-none', data.registrado !== false);
            } catch {
                // Si falla la verificación, no se muestra nada — el
                // login sigue funcionando normal igual.
            }
        }, 600);
    });
})();


function irADashboardOTienda(rol) {
    if (rol === 'COLABORADOR') {
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
}

function guardarSesion(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('rol', data.rol);
    localStorage.setItem('nombre', data.nombre);
    localStorage.setItem('cargo', data.cargo || '');
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    ocultarError();

    const correo = document.getElementById('correo').value.trim();
    const password = document.getElementById('password').value.trim();
    correoActual = correo;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, password })
        });

        const data = await response.json();

        if (!response.ok) {
            mostrarError(data.mensaje);
            return;
        }

        // Se utiliza para el móvil: paso 2, código OTP
        if (data.requiereOtp) {
            pendingLoginId = data.pendingLoginId;
            loginForm.classList.add('d-none');
            otpForm.classList.remove('d-none');
            return;
        }

        // Cliente: entra directo, sin pasos extra
        guardarSesion(data);
        irADashboardOTienda(data.rol);

    } catch (err) {
        mostrarError('Error al conectar con el servidor');
    }
});

otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    ocultarError();

    const otp = document.getElementById('otpCodigo').value.trim();

    try {
        const response = await fetch('/api/auth/login-verificar-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pendingLoginId, otp })
        });

        const data = await response.json();

        if (!response.ok) {
            mostrarError(data.mensaje);
            return;
        }

        guardarSesion(data);
        irADashboardOTienda(data.rol);

    } catch (err) {
        mostrarError('Error al conectar con el servidor');
    }
});

document.getElementById('otpCancelar').addEventListener('click', () => {
    pendingLoginId = null;
    otpForm.classList.add('d-none');
    loginForm.classList.remove('d-none');
    ocultarError();
});
