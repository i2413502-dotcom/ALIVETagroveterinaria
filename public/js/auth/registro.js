function cambiarTipoDoc() {
    const tipo = document.getElementById('tipoDocumento').value;
    const numDoc = document.getElementById('numeroDocumento');
    const estado = document.getElementById('doc-estado');

    // Limpiar campos
    numDoc.value = '';
    estado.innerHTML = '';
    limpiarCampos();

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
    const password = document.getElementById('password').value.trim();
    const confirmarPassword = document.getElementById('confirmarPassword').value.trim();
    const mensaje = document.getElementById('mensaje');

    mensaje.classList.add('d-none');

    if (password !== confirmarPassword) {
        mensaje.textContent = 'Las contraseñas no coinciden';
        mensaje.className = 'alert alert-danger';
        mensaje.classList.remove('d-none');
        return;
    }

    if (!tipoDocumento) {
        mensaje.textContent = 'Selecciona un tipo de documento';
        mensaje.className = 'alert alert-danger';
        mensaje.classList.remove('d-none');
        return;
    }

    try {
        const response = await fetch('/api/auth/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombres,
                apellidoPaterno,
                apellidoMaterno,
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

        localStorage.setItem('token', data.token);
        localStorage.setItem('rol', data.rol);
        localStorage.setItem('nombre', data.nombre);

        mensaje.textContent = 'Registro exitoso! Redirigiendo...';
        mensaje.className = 'alert alert-success';
        mensaje.classList.remove('d-none');

        setTimeout(() => {
            const redirect = localStorage.getItem('redirectAfterLogin');
            if (redirect === 'envio') {
                localStorage.removeItem('redirectAfterLogin');
                window.location.href = '/envio.html';
            } else {
                window.location.href = '/';
            }
        }, 1500);

    } catch (err) {
        mensaje.textContent = 'Error al conectar con el servidor';
        mensaje.className = 'alert alert-danger';
        mensaje.classList.remove('d-none');
    }
});