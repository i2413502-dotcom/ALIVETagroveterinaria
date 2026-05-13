// ═══════════════════════════════════════════════════
//  AUTH GUARD — ejecuta antes que cualquier otra cosa
// ═══════════════════════════════════════════════════
(function() {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/login.html'; }
})();

let perfilData = null;

// ══════════════════════════════════════
//  UTILIDADES
// ══════════════════════════════════════
function actualizarContadorCarrito() {
    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const total   = carrito.reduce((s, i) => s + i.cantidad, 0);
    const badge   = document.getElementById('cart-count');
    if (badge) badge.innerText = total;
}

function verificarLogin() {
    const token = localStorage.getItem('token');
    const rol   = localStorage.getItem('rol');
    if (!token || rol !== 'CLIENTE') window.location.href = '/login.html';
}

function mostrarSeccion(seccion, link) {
    ['datos','pedidos','password'].forEach(s =>
        document.getElementById('seccion-'+s).classList.add('d-none')
    );
    document.getElementById('seccion-'+seccion).classList.remove('d-none');

    document.querySelectorAll('.nav-perfil .nav-link').forEach(l => l.classList.remove('active'));
    if (link) link.classList.add('active');

    if (seccion === 'pedidos') cargarPedidos();
}

function cerrarSesion() {
    localStorage.clear();
    window.location.href = '/login.html';
}

// ══════════════════════════════════════
//  CARGAR PERFIL
// ══════════════════════════════════════
async function cargarPerfil() {
    const token = localStorage.getItem('token');
    try {
        const res  = await fetch('/api/auth/perfil', { headers: { 'Authorization':'Bearer '+token } });
        perfilData = await res.json();

        document.getElementById('perfil-nombre').innerText =
            `${perfilData.nombres} ${perfilData.apellido_paterno || ''}`;
        document.getElementById('perfil-correo').innerText = perfilData.correo;

        document.getElementById('datos-nombres').value           = perfilData.nombres || '';
        document.getElementById('datos-apellido-paterno').value  = perfilData.apellido_paterno || '';
        document.getElementById('datos-apellido-materno').value  = perfilData.apellido_materno || '';
        document.getElementById('datos-telefono').value          = perfilData.telefono || '';
        document.getElementById('datos-correo').value            = perfilData.correo || '';
        document.getElementById('datos-documento').value         =
            `${perfilData.tipo_documento || ''}: ${perfilData.numero_documento || ''}`;
    } catch (err) { console.error('Error perfil:', err); }
}

// ══════════════════════════════════════
//  TIMELINE DE ESTADO DEL PEDIDO
// ══════════════════════════════════════
function construirTimeline(estadoActual) {
    // Pasos en orden
    const pasos = [
        { key: 'PENDIENTE', label: 'Recibido',  icon: 'bi-clock'         },
        { key: 'PAGADO',    label: 'Pagado',    icon: 'bi-credit-card'   },
        { key: 'ENVIADO',   label: 'En camino', icon: 'bi-truck'         },
        { key: 'ENTREGADO', label: 'Entregado', icon: 'bi-house-check'   }
    ];

    if (estadoActual === 'CANCELADO') {
        return `
        <div class="timeline-estado">
            <div class="timeline-step cancelado">
                <div class="step-icon"><i class="bi bi-x-circle"></i></div>
                <div class="step-label">CANCELADO</div>
            </div>
        </div>`;
    }

    const orden = pasos.map(p => p.key);
    const idxActual = orden.indexOf(estadoActual);

    return `
    <div class="timeline-estado">
        ${pasos.map((paso, idx) => {
            let clase = '';
            if (idx < idxActual)  clase = 'pasado';
            if (idx === idxActual) clase = 'activo';
            return `
            <div class="timeline-step ${clase}">
                <div class="step-icon"><i class="bi ${paso.icon}"></i></div>
                <div class="step-label">${paso.label}</div>
            </div>`;
        }).join('')}
    </div>`;
}

// ══════════════════════════════════════
//  MIS PEDIDOS — lista principal
// ══════════════════════════════════════
async function cargarPedidos() {
    const token     = localStorage.getItem('token');
    const container = document.getElementById('lista-pedidos');
    container.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-success"></div></div>';

    try {
        const res     = await fetch('/api/pedidos/mispedidos', { headers: { 'Authorization':'Bearer '+token } });
        const pedidos = await res.json();

        if (!pedidos.length) {
            container.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="bi bi-bag-x" style="font-size:3rem;"></i>
                    <h5 class="mt-3">No tienes pedidos aún</h5>
                    <a href="/" class="btn btn-agro mt-2">Ver productos</a>
                </div>`;
            return;
        }

        container.innerHTML = pedidos.map(p => {
            const fecha    = new Date(p.fecha_pedido).toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' });
            const hora     = new Date(p.fecha_pedido).toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' });
            const timeline = construirTimeline(p.estado);

            return `
            <div class="pedido-card mb-3 p-3 bg-white" onclick="toggleDetalle(${p.id_pedido}, this)">
                <!-- Cabecera del pedido -->
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="fw-bold mb-1">Pedido #${p.id_pedido}</h6>
                        <span class="text-muted small"><i class="bi bi-calendar2 me-1"></i>${fecha} ${hora}</span>
                    </div>
                    <div class="text-end">
                        <h5 class="fw-bold text-success mb-1">S/. ${parseFloat(p.total).toFixed(2)}</h5>
                        <small class="text-muted">${p.total_items} ${p.total_items === 1 ? 'producto' : 'productos'}</small>
                    </div>
                </div>

                <!-- Timeline visual -->
                ${timeline}

                <!-- Dirección y comprobante -->
                <div class="d-flex flex-wrap gap-3 mt-2">
                    <span class="text-muted small">
                        <i class="bi bi-geo-alt me-1 text-success"></i>${p.direccion_entrega || '-'}
                    </span>
                    <span class="text-muted small">
                        <i class="bi bi-receipt me-1 text-success"></i>${p.tipo_comprobante || 'Boleta'}
                    </span>
                </div>

                <!-- Detalle colapsable -->
                <div class="detalle-collapse mt-3 d-none" id="detalle-${p.id_pedido}">
                    <div class="detalle-productos" id="productos-${p.id_pedido}">
                        <div class="text-center py-2">
                            <div class="spinner-border spinner-border-sm text-success"></div>
                        </div>
                    </div>
                </div>

                <div class="text-center mt-2">
                    <small class="text-muted" id="toggle-label-${p.id_pedido}">
                        <i class="bi bi-chevron-down me-1"></i>Ver productos
                    </small>
                </div>
            </div>`;
        }).join('');

    } catch (err) {
        console.error('Error cargando pedidos:', err);
        container.innerHTML = '<p class="text-danger text-center">Error al cargar pedidos</p>';
    }
}

// ══════════════════════════════════════
//  TOGGLE DETALLE DEL PEDIDO
// ══════════════════════════════════════
async function toggleDetalle(idPedido, card) {
    const contenedor = document.getElementById('detalle-'+idPedido);
    const label      = document.getElementById('toggle-label-'+idPedido);
    const estaAbierto = !contenedor.classList.contains('d-none');

    if (estaAbierto) {
        contenedor.classList.add('d-none');
        label.innerHTML = '<i class="bi bi-chevron-down me-1"></i>Ver productos';
        return;
    }

    contenedor.classList.remove('d-none');
    label.innerHTML = '<i class="bi bi-chevron-up me-1"></i>Ocultar';

    // Cargar productos si aún no se cargaron
    const productosDiv = document.getElementById('productos-'+idPedido);
    if (productosDiv.dataset.cargado) return;

    try {
        const token = localStorage.getItem('token');
        const res   = await fetch('/api/pedidos/mispedidos/'+idPedido, {
            headers: { 'Authorization':'Bearer '+token }
        });
        const data  = await res.json();
        productosDiv.dataset.cargado = '1';

        if (!data.detalles || !data.detalles.length) {
            productosDiv.innerHTML = '<p class="text-muted small text-center mb-0">Sin productos</p>';
            return;
        }

        productosDiv.innerHTML = data.detalles.map(item => {
    const imgSrc = item.imagen
        ? (item.imagen.startsWith('http') ? item.imagen : `/img/productos/${item.imagen}`)
        : '/img/logo.jpeg';

    // ✅ Mostrar detalles: color, talla, marca
    const extras = [];
    if (item.color) extras.push(`<span class="badge bg-secondary me-1">Color: ${item.color}</span>`);
    if (item.talla) extras.push(`<span class="badge bg-secondary me-1">Talla: ${item.talla}</span>`);
    if (item.marca) extras.push(`<span class="badge bg-light text-dark border me-1">Marca: ${item.marca}</span>`);
    const extrasHTML = extras.length ? `<div class="mt-1">${extras.join('')}</div>` : '';

    return `
    <div class="prod-item">
        <img src="${imgSrc}" alt="${item.producto_nombre}" class="prod-img">
        <div class="flex-grow-1">
            <div class="fw-bold small">${item.producto_nombre}</div>
            <div class="text-muted small">
                ${item.cantidad} x S/. ${parseFloat(item.precio_unitario).toFixed(2)}
            </div>
            ${extrasHTML}
        </div>
        <div class="text-success fw-bold small">
            S/. ${parseFloat(item.subtotal).toFixed(2)}
        </div>
    </div>`;
}).join('') + `
        <div class="d-flex justify-content-between pt-2 mt-1 border-top">
            <span class="text-muted small">Total del pedido</span>
            <span class="fw-bold text-success">S/. ${parseFloat(data.total).toFixed(2)}</span>
        </div>`;

    } catch (err) {
        productosDiv.innerHTML = '<p class="text-danger small text-center mb-0">Error al cargar productos</p>';
    }
}

// ══════════════════════════════════════
//  GUARDAR DATOS PERSONALES
// ══════════════════════════════════════
document.getElementById('formDatos').addEventListener('submit', async (e) => {
    e.preventDefault();
    const token   = localStorage.getItem('token');
    const mensaje = document.getElementById('mensaje-datos');
    try {
        const res = await fetch('/api/auth/actualizar-perfil', {
            method:  'PUT',
            headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+token },
            body: JSON.stringify({
                nombres:          document.getElementById('datos-nombres').value.trim(),
                apellido_paterno: document.getElementById('datos-apellido-paterno').value.trim(),
                apellido_materno: document.getElementById('datos-apellido-materno').value.trim(),
                telefono:         document.getElementById('datos-telefono').value.trim()
            })
        });
        const data = await res.json();
        mensaje.textContent = data.mensaje;
        mensaje.className   = `alert ${res.ok ? 'alert-success' : 'alert-danger'}`;
        mensaje.classList.remove('d-none');

        if (res.ok) {
            const nuevoNombre = document.getElementById('datos-nombres').value.trim();
            localStorage.setItem('nombre', nuevoNombre);
            document.getElementById('perfil-nombre').innerText =
                nuevoNombre + ' ' + (document.getElementById('datos-apellido-paterno').value.trim());
        }
    } catch (err) {
        mensaje.textContent = 'Error al guardar cambios';
        mensaje.className   = 'alert alert-danger';
        mensaje.classList.remove('d-none');
    }
});

// ══════════════════════════════════════
//  CAMBIAR CONTRASEÑA
// ══════════════════════════════════════
document.getElementById('formPassword').addEventListener('submit', async (e) => {
    e.preventDefault();
    const token      = localStorage.getItem('token');
    const mensaje    = document.getElementById('mensaje-password');
    const passNueva  = document.getElementById('pass-nueva').value;
    const passConfirm= document.getElementById('pass-confirmar').value;

    if (passNueva !== passConfirm) {
        mensaje.textContent = 'Las contraseñas no coinciden';
        mensaje.className   = 'alert alert-danger';
        mensaje.classList.remove('d-none');
        return;
    }
    try {
        const res = await fetch('/api/auth/cambiar-password', {
            method:  'PUT',
            headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+token },
            body: JSON.stringify({
                passwordActual: document.getElementById('pass-actual').value,
                passwordNueva:  passNueva
            })
        });
        const data = await res.json();
        mensaje.textContent = data.mensaje;
        mensaje.className   = `alert ${res.ok ? 'alert-success' : 'alert-danger'}`;
        mensaje.classList.remove('d-none');
        if (res.ok) document.getElementById('formPassword').reset();
    } catch (err) {
        mensaje.textContent = 'Error al cambiar contraseña';
        mensaje.className   = 'alert alert-danger';
        mensaje.classList.remove('d-none');
    }
});

// ══════════════════════════════════════
//  INIT
// ══════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
    verificarLogin();
    cargarPerfil();
    actualizarContadorCarrito();

    // Si viene de confirmación, abrir directamente la sección de pedidos
    const seccionPendiente = localStorage.getItem('perfilSeccion');
    if (seccionPendiente) {
        localStorage.removeItem('perfilSeccion');
        const link = document.querySelector(`.nav-perfil .nav-link[onclick*="'${seccionPendiente}'"]`);
        mostrarSeccion(seccionPendiente, link);
    }
});