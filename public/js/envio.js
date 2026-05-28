let subtotalProductos = 0;
let costoEnvioActual  = 0;
let distritoActual    = null;

function verificarLogin() {
    const token = localStorage.getItem('token');
    if (!token) {
        localStorage.setItem('redirectAfterLogin', 'envio');
        window.location.href = '/login.html';
    }
}

async function cargarDatosCliente() {
    const token = localStorage.getItem('token');
    try {
        const res  = await fetch('/api/auth/datos-envio', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await res.json();

        // Prellenar nombre
        if (data.nombres) {
            const nombreCompleto = `${data.nombres} ${data.apellido_paterno || ''}`.trim();
            document.getElementById('nombreEnvio').value = nombreCompleto;
        }

        // Prellenar teléfono
        if (data.telefono) {
            document.getElementById('telefono').value = data.telefono;
        }

        // Prellenar dirección habitual si existe
        if (data.direccion_habitual) {
            document.getElementById('direccion').value = data.direccion_habitual;
        }

        // Prellenar referencia habitual si existe
        if (data.referencia_habitual) {
            document.getElementById('referencias').value = data.referencia_habitual;
        }

        // Guardar número de documento para usarlo en comprobante
        if (data.numero_documento) {
            localStorage.setItem('numero_documento', data.numero_documento);
            localStorage.setItem('tipo_documento', data.tipo_documento || 'DNI');
        }

    } catch (err) {
        console.error('Error cargando datos del cliente:', err);
        // Fallback: usar nombre del localStorage
        const nombre = localStorage.getItem('nombre');
        if (nombre) document.getElementById('nombreEnvio').value = nombre;
    }
}

function cargarResumen() {
    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    if (carrito.length === 0) { window.location.href = '/'; return; }

    const container = document.getElementById('resumen-items');
    subtotalProductos = 0;

    container.innerHTML = carrito.map(item => {
        const precio      = parseFloat(item.precio) || 0;
        const cantidad    = parseInt(item.cantidad) || 1;
        const itemSubtotal = precio * cantidad;
        subtotalProductos += itemSubtotal;

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

    document.getElementById('resumen-subtotal').innerText = 'S/. ' + subtotalProductos.toFixed(2);
    document.getElementById('resumen-total').innerText    = 'S/. ' + subtotalProductos.toFixed(2);
}

async function cargarDepartamentos() {
    try {
        const res = await fetch('/api/ubigeo/departamentos');
        const departamentos = await res.json();
        const select = document.getElementById('departamento');

        departamentos.forEach(d => {
            const option = document.createElement('option');
            option.value = d.id_departamento;
            option.text  = d.nombre;
            select.appendChild(option);
        });

        // Bloquear al departamento JUNÍN automáticamente
        const junin = departamentos.find(d => d.nombre.toUpperCase() === 'JUNÍN' || d.nombre.toUpperCase() === 'JUNIN');
        if (junin) {
            select.value    = junin.id_departamento;
            select.disabled = true;
            await cargarProvincias();
        }
    } catch (err) { console.error('Error cargando departamentos:', err); }
}

async function cargarProvincias() {
    const idDepartamento  = document.getElementById('departamento').value;
    const selectProvincia = document.getElementById('provincia');
    const selectDistrito  = document.getElementById('distrito');

    selectProvincia.innerHTML = '<option value="">Seleccione...</option>';
    selectDistrito.innerHTML  = '<option value="">Seleccione...</option>';
    selectProvincia.disabled  = true;
    selectDistrito.disabled   = true;

    if (!idDepartamento) return;

    try {
        const res = await fetch(`/api/ubigeo/provincias/${idDepartamento}`);
        const provincias = await res.json();
        provincias.forEach(p => {
            const option = document.createElement('option');
            option.value = p.id_provincia;
            option.text  = p.nombre;
            selectProvincia.appendChild(option);
        });
        selectProvincia.disabled = false;
    } catch (err) { console.error('Error cargando provincias:', err); }
}

async function cargarDistritos() {
    const idProvincia    = document.getElementById('provincia').value;
    const selectDistrito = document.getElementById('distrito');

    selectDistrito.innerHTML = '<option value="">Seleccione...</option>';
    selectDistrito.disabled  = true;

    if (!idProvincia) return;

    try {
        const res = await fetch(`/api/ubigeo/distritos/${idProvincia}`);
        const distritos = await res.json();
        distritos.forEach(d => {
            const option = document.createElement('option');
            option.value = d.id_distrito;
            option.text  = d.nombre;
            option.setAttribute('data-costo', d.costo_envio);
            selectDistrito.appendChild(option);
        });
        selectDistrito.disabled = false;
    } catch (err) { console.error('Error cargando distritos:', err); }
}

function actualizarCostoEnvio() {
    const zonaSelect = document.getElementById('zona-envio');
    if (!zonaSelect.value) return;

    const costosPorZona = { '1': 5.00, '2': 8.00, '3': 10.00 };
    costoEnvioActual = costosPorZona[zonaSelect.value] || 5.00;

    const badge = document.getElementById('costo-envio-badge');
    badge.style.display = 'block';
    document.getElementById('costo-envio-texto').innerText = 'S/. ' + costoEnvioActual.toFixed(2);

    document.getElementById('resumen-envio').innerText = 'S/. ' + costoEnvioActual.toFixed(2);
    document.getElementById('resumen-envio').classList.remove('text-muted');
    document.getElementById('resumen-envio').classList.add('text-success', 'fw-bold');

    const total = subtotalProductos + costoEnvioActual;
    document.getElementById('resumen-total').innerText = 'S/. ' + total.toFixed(2);
}

function actualizarDistritoActual() {
    const selectDistrito = document.getElementById('distrito');
    if (!selectDistrito.value) return;
    distritoActual = {
        id:     selectDistrito.value,
        nombre: selectDistrito.options[selectDistrito.selectedIndex].text
    };
}

document.getElementById('envioForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre     = document.getElementById('nombreEnvio').value.trim();
    const telefono   = document.getElementById('telefono').value.trim();
    const direccion  = document.getElementById('direccion').value.trim();
    const referencias = document.getElementById('referencias').value.trim();

    const depSelect  = document.getElementById('departamento');
    const provSelect = document.getElementById('provincia');
    const distSelect = document.getElementById('distrito');
    const zonaSelect = document.getElementById('zona-envio');

    if (!/^9\d{8}$/.test(telefono)) { alert('El teléfono debe tener 9 dígitos y empezar con 9'); return; }
    if (!distSelect.value) { alert('Por favor selecciona un distrito'); return; }
    if (!distritoActual)   { alert('Por favor selecciona un distrito válido'); return; }
    if (!zonaSelect.value) { alert('Por favor selecciona una zona de envío'); return; }

    const depNombre  = depSelect.options[depSelect.selectedIndex].text;
    const provNombre = provSelect.options[provSelect.selectedIndex].text;
    const distNombre = distSelect.options[distSelect.selectedIndex].text;

    const datosEnvio = {
        nombre,
        telefono,
        direccion,
        referencias,
        id_distrito:         distritoActual.id,
        id_zona:             parseInt(zonaSelect.value, 10),
        nombre_distrito:     distNombre,
        nombre_provincia:    provNombre,
        nombre_departamento: depNombre,
        direccion_completa:  `${direccion}, ${distNombre}, ${provNombre}, ${depNombre}`,
        costo_envio:         costoEnvioActual,
        total:               subtotalProductos + costoEnvioActual
    };

    localStorage.setItem('datosEnvio', JSON.stringify(datosEnvio));

    // Guardar dirección habitual para futuros pedidos
    try {
        const token = localStorage.getItem('token');
        await fetch('/api/auth/guardar-direccion', {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ direccion, referencia: referencias, telefono })
        });
    } catch (err) {
        console.error('Error guardando dirección:', err);
    }

    window.location.href = '/comprobante.html';
});

// Filtro de solo dígitos en el teléfono (máx 9)
function filtrarTelefono() {
    const tel = document.getElementById('telefono');
    if (!tel) return;
    tel.addEventListener('input', () => {
        tel.value = tel.value.replace(/\D/g, '').slice(0, 9);
    });
}

window.addEventListener('DOMContentLoaded', () => {
    verificarLogin();
    cargarResumen();
    cargarDepartamentos();
    cargarDatosCliente();
    filtrarTelefono();
});