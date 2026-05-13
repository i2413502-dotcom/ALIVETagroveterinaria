let tipoSeleccionado = null;

async function seleccionarTipo(tipo) {
    tipoSeleccionado = tipo;
    document.getElementById('card-boleta').classList.toggle('seleccionado', tipo === 'boleta');
    document.getElementById('card-factura').classList.toggle('seleccionado', tipo === 'factura');
    document.getElementById('form-boleta').classList.toggle('d-none', tipo !== 'boleta');
    document.getElementById('form-factura').classList.toggle('d-none', tipo !== 'factura');
    document.getElementById('mensaje-tipo').classList.add('d-none');

    // Autocompletar nombre del cliente al seleccionar Boleta
    if (tipo === 'boleta') {
        try {
            const token = localStorage.getItem('token');
            const res  = await fetch('/api/auth/perfil', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await res.json();
            if (data.nombres) {
                const nombreCompleto = [data.nombres, data.apellido_paterno, data.apellido_materno]
                    .filter(Boolean).join(' ').trim();
                document.getElementById('nombre-boleta').value = nombreCompleto;
            }
        } catch (err) {
            console.error('Error cargando perfil:', err);
        }
    }
}

function cargarResumen() {
    const carrito    = JSON.parse(localStorage.getItem('carrito')) || [];
    const datosEnvio = JSON.parse(localStorage.getItem('datosEnvio')) || {};

    if (carrito.length === 0) { window.location.href = '/'; return; }

    const container = document.getElementById('resumen-items');
    let subtotal = 0;

    container.innerHTML = carrito.map(item => {
        const precio      = parseFloat(item.precio) || 0;
        const cantidad    = parseInt(item.cantidad) || 1;
        const itemSubtotal = precio * cantidad;
        subtotal += itemSubtotal;

        const extras = [];
        if (item.color) extras.push(`Color: ${item.color}`);
        if (item.talla) extras.push(`Talla: ${item.talla}`);
        const extrasHTML = extras.length
            ? `<small class="text-muted d-block">${extras.join(' | ')}</small>` : '';

        return `
        <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
                <span class="fw-bold">${item.nombre}</span>
                <small class="text-muted d-block">x${cantidad} unidades</small>
                ${extrasHTML}
            </div>
            <span class="text-success fw-bold">S/. ${itemSubtotal.toFixed(2)}</span>
        </div>`;
    }).join('');

    const costoEnvio = parseFloat(datosEnvio.costo_envio) || 0;
    const total      = subtotal + costoEnvio;

    document.getElementById('resumen-subtotal').innerText = 'S/. ' + subtotal.toFixed(2);
    document.getElementById('resumen-envio').innerText    = 'S/. ' + costoEnvio.toFixed(2);
    document.getElementById('resumen-total').innerText    = 'S/. ' + total.toFixed(2);

    const datosDiv = document.getElementById('resumen-envio-datos');
    if (datosDiv && datosEnvio.direccion_completa) {
        datosDiv.innerHTML = `
            <p class="mb-1"><i class="bi bi-person me-1"></i>${datosEnvio.nombre || ''}</p>
            <p class="mb-1"><i class="bi bi-geo-alt me-1"></i>${datosEnvio.direccion_completa}</p>
            <p class="mb-0"><i class="bi bi-telephone me-1"></i>${datosEnvio.telefono || ''}</p>
        `;
    }
}

async function validarDNI() {
    const dni = document.getElementById('dni').value.trim();
    const resultado = document.getElementById('resultado-dni');
    if (dni.length !== 8) {
        resultado.innerHTML = '<small class="text-danger">El DNI debe tener 8 dígitos</small>';
        return;
    }
    resultado.innerHTML = '<small class="text-muted">Validando...</small>';
    try {
        const token = localStorage.getItem('token');
        const res   = await fetch(`/api/auth/consultar-documento?tipo=DNI&numero=${dni}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data  = await res.json();
        if (data.success) {
            const nombreCompleto = data.nombreCompleto ||
                [data.nombres, data.apellidoPaterno, data.apellidoMaterno].filter(Boolean).join(' ').trim();
            document.getElementById('nombre-boleta').value = nombreCompleto;
            resultado.innerHTML = '<small class="text-success"><i class="bi bi-check-circle me-1"></i>DNI válido</small>';
        } else {
            resultado.innerHTML = `<small class="text-danger">${data.mensaje || 'No se encontró información para ese DNI'}</small>`;
        }
    } catch {
        resultado.innerHTML = '<small class="text-muted">No se pudo validar, ingresa el nombre manualmente</small>';
    }
}

async function validarRUC() {
    const ruc = document.getElementById('ruc').value.trim();
    const resultado = document.getElementById('resultado-ruc');
    if (ruc.length !== 11) {
        resultado.innerHTML = '<small class="text-danger">El RUC debe tener 11 dígitos</small>';
        return;
    }
    resultado.innerHTML = '<small class="text-muted">Validando...</small>';
    try {
        const token = localStorage.getItem('token');
        const res   = await fetch(`/api/auth/consultar-documento?tipo=RUC&numero=${ruc}`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data  = await res.json();
        if (data.success) {
            document.getElementById('razon-social').value     = data.razonSocial || '';
            document.getElementById('direccion-fiscal').value = data.direccion   || '';
            resultado.innerHTML = '<small class="text-success"><i class="bi bi-check-circle me-1"></i>RUC válido</small>';
        } else {
            resultado.innerHTML = `<small class="text-danger">${data.mensaje || 'No se encontró información para ese RUC'}</small>`;
        }
    } catch {
        resultado.innerHTML = '<small class="text-muted">No se pudo validar, ingresa los datos manualmente</small>';
    }
}

function continuarPago() {
    if (!tipoSeleccionado) {
        document.getElementById('mensaje-tipo').classList.remove('d-none');
        return;
    }

    const datosComprobante = { tipo: tipoSeleccionado };

    if (tipoSeleccionado === 'boleta') {
        datosComprobante.dni    = document.getElementById('dni').value.trim();
        datosComprobante.nombre = document.getElementById('nombre-boleta').value.trim();
    } else {
        datosComprobante.ruc            = document.getElementById('ruc').value.trim();
        datosComprobante.razon_social   = document.getElementById('razon-social').value.trim();
        datosComprobante.direccion_fiscal = document.getElementById('direccion-fiscal').value.trim();
    }

    localStorage.setItem('datosComprobante', JSON.stringify(datosComprobante));
    window.location.href = '/pago.html';
}

window.addEventListener('DOMContentLoaded', () => {
    cargarResumen();
    precargarDocumento();
});

function precargarDocumento() {
    const numDoc  = localStorage.getItem('numero_documento');
    const tipoDoc = localStorage.getItem('tipo_documento');

    if (!numDoc) return;

    if (tipoDoc === 'DNI') {
        seleccionarTipo('boleta');
        document.getElementById('dni').value = numDoc;
    } else if (tipoDoc === 'RUC') {
        seleccionarTipo('factura');
        document.getElementById('ruc').value = numDoc;
    }
}