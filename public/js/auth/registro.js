function cambiarTipoDoc() {
    const tipo = document.getElementById('tipoDocumento').value;
    const numDoc = document.getElementById('numeroDocumento');
    const estado = document.getElementById('doc-estado');

    // Limpiar campos
    numDoc.value = '';
    estado.innerHTML = '';
    limpiarCampos();

    // RUC = empresa (sin apellidos): ocultar, deshabilitar y quitar required.
    // DNI / sin selección: restaurar apellidos.
    const esRuc = tipo === 'RUC';
    const filaApellidos = document.getElementById('fila-apellidos');
    const apPat = document.getElementById('apellidoPaterno');
    const apMat = document.getElementById('apellidoMaterno');
    if (filaApellidos) filaApellidos.style.display = esRuc ? 'none' : '';
    [apPat, apMat].forEach(el => {
        if (!el) return;
        el.required = !esRuc;
        el.disabled = esRuc;
    });

    if (tipo === 'DNI') {
        numDoc.maxLength = 8;
        numDoc.placeholder = 'Ingresa tu DNI (8 dígitos)';
    } else if (tipo === 'RUC') {
        numDoc.maxLength = 11;
        numDoc.placeholder = 'Ingresa tu RUC (11 dígitos)';
    }
}

function limpiarCampos() {
    document.getElementById('nombres').value = '';
    document.getElementById('apellidoPaterno').value = '';
    document.getElementById('apellidoMaterno').value = '';
}

async function consultarDocumento() {
    const tipo = document.getElementById('tipoDocumento').value;
    const numero = document.getElementById('numeroDocumento').value.trim();
    const estado = document.getElementById('doc-estado');
    const btn = document.getElementById('btn-consultar');

    if (!tipo) {
        estado.innerHTML = '<span class="text-danger">Selecciona el tipo de documento</span>';
        return;
    }

    if (tipo === 'DNI' && numero.length !== 8) {
        estado.innerHTML = '<span class="text-danger">El DNI debe tener 8 dígitos</span>';
        return;
    }

    if (tipo === 'RUC' && numero.length !== 11) {
        estado.innerHTML = '<span class="text-danger">El RUC debe tener 11 dígitos</span>';
        return;
    }

    // Loading
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    estado.innerHTML = '<span class="text-muted">Consultando...</span>';

    try {
        const response = await fetch(`/api/auth/consultar-documento?tipo=${tipo}&numero=${numero}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            estado.innerHTML = `<span class="text-danger"><i class="bi bi-x-circle me-1"></i>${data.mensaje || 'No se encontró el documento'}</span>`;
            limpiarCampos();
        } else {
            if (tipo === 'DNI') {
                document.getElementById('nombres').value = data.nombres || '';
                document.getElementById('apellidoPaterno').value = data.apellidoPaterno || '';
                document.getElementById('apellidoMaterno').value = data.apellidoMaterno || '';
            } else {
                document.getElementById('nombres').value = data.razonSocial || '';
                document.getElementById('apellidoPaterno').value = '';
                document.getElementById('apellidoMaterno').value = '';
            }
            estado.innerHTML = '<span class="text-success"><i class="bi bi-check-circle me-1"></i>Datos encontrados</span>';
        }
    } catch (err) {
        estado.innerHTML = '<span class="text-warning"><i class="bi bi-exclamation-circle me-1"></i>No se pudo consultar, ingresa tus datos manualmente</span>';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-search"></i>';
    }
}

document.getElementById('registroForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const tipoDocumento = document.getElementById('tipoDocumento').value;
    const numeroDocumento = document.getElementById('numeroDocumento').value.trim();
    const nombres = document.getElementById('nombres').value.trim();
    const apellidoPaterno = document.getElementById('apellidoPaterno').value.trim();
    const apellidoMaterno = document.getElementById('apellidoMaterno').value.trim();
    const correo = document.getElementById('correo').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const password = document.getElementById('password').value.trim();
    const confirmarPassword = document.getElementById('confirmarPassword').value.trim();
    const mensaje = document.getElementById('mensaje');

    mensaje.classList.add('d-none');

    const mostrarError = (texto) => {
        mensaje.textContent = texto;
        mensaje.className = 'alert alert-danger';
        mensaje.classList.remove('d-none');
    };

    if (password !== confirmarPassword) return mostrarError('Las contraseñas no coinciden');
    if (!tipoDocumento) return mostrarError('Selecciona un tipo de documento');

    // Validación estricta de documento
    if (tipoDocumento === 'DNI' && !/^\d{8}$/.test(numeroDocumento)) {
        return mostrarError('El DNI debe tener exactamente 8 dígitos numéricos');
    }
    if (tipoDocumento === 'RUC' && !/^\d{11}$/.test(numeroDocumento)) {
        return mostrarError('El RUC debe tener exactamente 11 dígitos numéricos');
    }
    // Validación de teléfono (9 dígitos, empieza con 9)
    if (!/^9\d{8}$/.test(telefono)) {
        return mostrarError('El teléfono debe tener 9 dígitos y empezar con 9');
    }

    try {
        const response = await fetch('/api/auth/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombres,
                apellidoPaterno,
                apellidoMaterno,
                telefono,
                correo,
                password,
                tipoDocumento,
                numeroDocumento
            })
        });

        const data = await response.json();

        if (!response.ok) {
            mensaje.textContent = data.mensaje;
            mensaje.className = 'alert alert-danger';
            mensaje.classList.remove('d-none');
            return;
        }

                // Guardar pendingId y redirigir a verificación OTP
        localStorage.setItem('pendingId', data.pendingId);
        
        mensaje.textContent = 'Código enviado a tu correo. Redirigiendo...';
        mensaje.className = 'alert alert-success';
        mensaje.classList.remove('d-none');

        setTimeout(() => {
            window.location.href = '/verify-otp.html';
        }, 1500);

    } catch (err) {
        mensaje.textContent = 'Error al conectar con el servidor';
        mensaje.className = 'alert alert-danger';
        mensaje.classList.remove('d-none');
    }
});

// ── Filtro de solo dígitos (respeta el maxLength del input) ─────
function filtrarSoloDigitos(input) {
    if (!input) return;
    input.addEventListener('input', () => {
        const max = input.maxLength > 0 ? input.maxLength : 524288;
        input.value = input.value.replace(/\D/g, '').slice(0, max);
    });
}
filtrarSoloDigitos(document.getElementById('numeroDocumento'));
filtrarSoloDigitos(document.getElementById('telefono'));
// ═══════════════════════════════════════════════════
//  DESPACHADOR DE EVENTOS (mismo patrón que dashboard.js/index.js)
// ═══════════════════════════════════════════════════
document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-accion]');
    if (!el) return;
    if (el.dataset.accion === 'consultar-documento') consultarDocumento();
});

// ── Autobúsqueda: Enter o al completar los dígitos requeridos ──
function activarAutobusqueda(inputId, tipoSelectId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            consultarDocumento();
        }
    });

    input.addEventListener('input', () => {
        const tipo = document.getElementById(tipoSelectId).value;
        const len = input.value.length;
        if ((tipo === 'DNI' && len === 8) || (tipo === 'RUC' && len === 11)) {
            consultarDocumento();
        }
    });
}
activarAutobusqueda('numeroDocumento', 'tipoDocumento');

// ── Validación en vivo del correo (existencia del dominio) ──
const correoInputEl = document.getElementById('correo');
let debounceCorreo;
if (correoInputEl) {
    correoInputEl.addEventListener('input', () => {
        clearTimeout(debounceCorreo);
        const estadoCorreo = document.getElementById('correo-estado');
        if (!estadoCorreo) return;
        estadoCorreo.textContent = '';
        debounceCorreo = setTimeout(async () => {
            if (!correoInputEl.value.includes('@')) return;
            estadoCorreo.textContent = 'Verificando...';
            estadoCorreo.style.color = '';
            try {
                const res = await fetch(`/api/auth/validar-correo?correo=${encodeURIComponent(correoInputEl.value.trim())}`);
                const data = await res.json();
                estadoCorreo.textContent = data.valido ? '✅ Correo válido' : `❌ ${data.motivo}`;
                estadoCorreo.style.color = data.valido ? 'green' : 'crimson';
            } catch {
                estadoCorreo.textContent = '';
            }
        }, 600); // debounce: espera a que el usuario deje de escribir
    });
}
