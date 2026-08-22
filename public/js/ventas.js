// ── Auth guard: solo COLABORADOR ──
(function () {
    const token = localStorage.getItem('token');
    const rol   = localStorage.getItem('rol');
    if (!token || rol !== 'COLABORADOR') { window.location.href = '/login.html'; }
})();

let paginaVentas = 1;
let modalDetalle = null;
let idPedidoDetalleActual = null;
let vistaActual = 'activos';       // 'activos' | 'historial'
let tipoEntregaActual = '';        // '' | 'DELIVERY' | 'RECOJO_TIENDA'

// Opciones del <select> Estado, según la pestaña activa. En "activos" solo
// tiene sentido filtrar por los estados que aún requieren gestión; en
// "historial" solo por los que ya se cerraron.
const ESTADOS_POR_VISTA = {
    activos:   [['PENDIENTE', 'Pendiente'], ['PAGADO', 'Pagado'], ['ENVIADO', 'Enviado']],
    historial: [['ENTREGADO', 'Entregado'], ['CANCELADO', 'Cancelado']]
};

function pintarOpcionesEstado() {
    const sel = document.getElementById('filtro-estado');
    const opciones = ESTADOS_POR_VISTA[vistaActual];
    sel.innerHTML = '<option value="">Todos</option>' +
        opciones.map(([v, txt]) => `<option value="${v}">${txt}</option>`).join('');
}

function cambiarVista(vista) {
    vistaActual = vista;
    document.querySelectorAll('#tabs-vista [data-vista]').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.vista === vista));
    pintarOpcionesEstado();
    aplicarFiltros();
}

function cambiarTipoEntrega(tipo) {
    tipoEntregaActual = tipo;
    document.querySelectorAll('#grupo-tipo-entrega [data-tipo]').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.tipo === tipo));
    aplicarFiltros();
}

const soles = n => 'S/. ' + (Number(n) || 0).toFixed(2);

function cerrarSesion() {
    ['token', 'rol', 'nombre'].forEach(k => localStorage.removeItem(k));
    window.location.href = '/login.html';
}

function badgeEstado(estado) {
    const c = { PENDIENTE: 'warning text-dark', PAGADO: 'info text-dark',
                ENVIADO: 'primary', ENTREGADO: 'success', CANCELADO: 'danger' };
    return `<span class="badge bg-${c[estado] || 'secondary'}">${estado}</span>`;
}

// Colores de fondo por estado, para que el <select> se note a simple
// vista igual que antes el badge (mismo criterio de colores).
const ESTADOS_COLOR_FONDO = {
    PENDIENTE: '#fff3cd',
    PAGADO:    '#cff4fc',
    ENVIADO:   '#cfe2ff',
    ENTREGADO: '#d1e7dd',
    CANCELADO: '#f8d7da'
};
const ESTADOS_VENTA = ['PENDIENTE', 'PAGADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'];

// Reemplaza el badge de solo lectura por un <select> editable directo
// en la tabla (antes solo se podía cambiar el estado abriendo el modal
// de detalle). data-anterior guarda el valor previo por si el PUT falla
// y hay que revertir la selección visualmente.
function selectEstado(idPedido, estadoActual) {
    const opciones = ESTADOS_VENTA.map(e =>
        `<option value="${e}" ${e === estadoActual ? 'selected' : ''}>${e}</option>`
    ).join('');
    const color = ESTADOS_COLOR_FONDO[estadoActual] || '#e9ecef';
    return `<select class="form-select form-select-sm estado-select"
                     data-id="${idPedido}" data-anterior="${estadoActual}"
                     style="background:${color}; font-weight:600; min-width:130px;">
                ${opciones}
            </select>`;
}

function filtrosActuales() {
    return {
        vista:       vistaActual,
        tipoEntrega: tipoEntregaActual,
        estado:      document.getElementById('filtro-estado').value,
        codigo:      document.getElementById('filtro-codigo').value.trim(),
        desde:       document.getElementById('filtro-desde').value,
        hasta:       document.getElementById('filtro-hasta').value
    };
}

function badgeEntrega(tipo) {
    return tipo === 'RECOJO_TIENDA'
        ? '<span class="badge bg-secondary"><i class="bi bi-shop me-1"></i>Recojo</span>'
        : '<span class="badge bg-success"><i class="bi bi-truck me-1"></i>Delivery</span>';
}

function queryString(extra = {}) {
    const f = { ...filtrosActuales(), ...extra };
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v) p.set(k, v); });
    return p.toString();
}

// ── Listar ventas ──
async function cargarVentas() {
    const tbody = document.getElementById('tabla-ventas');
    try {
        const token = localStorage.getItem('token');
        const res  = await fetch('/api/ventas?' + queryString({ pagina: paginaVentas, limite: 20 }), { headers: { 'Authorization': 'Bearer ' + token } });
        const data = await res.json();

        if (!data.ventas || !data.ventas.length) {
            const msg = vistaActual === 'historial' ? 'No hay ventas en el historial' : 'No hay ventas activas';
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">${msg}</td></tr>`;
            document.getElementById('paginacion-ventas').innerHTML = '';
            return;
        }

        tbody.innerHTML = data.ventas.map(v => `
            <tr>
                <td><strong>${v.comprobante}</strong></td>
                <td>${new Date(v.fecha).toLocaleDateString('es-PE')}</td>
                <td>${v.cliente || '—'}</td>
                <td><span class="badge bg-light text-dark border">${v.tipo}</span></td>
                <td class="text-end fw-bold text-success">${soles(v.total)}</td>
                <td>${v.metodo_pago}</td>
                <td>${badgeEntrega(v.tipo_entrega)}</td>
                <td>${selectEstado(v.id_pedido, v.estado)}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-success" title="Ver detalle" data-accion="ver-detalle" data-id="${v.id_pedido}">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>`).join('');

        renderPaginacion(data);
    } catch (err) {
        console.error('Error cargando ventas:', err);
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error al cargar ventas</td></tr>';
    }
}

function renderPaginacion(data) {
    const cont = document.getElementById('paginacion-ventas');
    const totalPaginas = data.totalPaginas || 1;
    const actual       = data.pagina || 1;
    if (totalPaginas <= 1) { cont.innerHTML = ''; return; }

    let html = `<span class="text-muted small me-2">Página ${actual} de ${totalPaginas} (${data.total} ventas)</span>`;
    html += `<button class="btn btn-sm btn-outline-success" ${actual === 1 ? 'disabled' : ''} data-accion="ir-pagina" data-pagina="${actual - 1}">← Anterior</button>`;
    const ini = Math.max(1, actual - 2);
    const fin = Math.min(totalPaginas, ini + 4);
    for (let i = ini; i <= fin; i++) {
        html += `<button class="btn btn-sm ${i === actual ? 'btn-success' : 'btn-outline-success'}" data-accion="ir-pagina" data-pagina="${i}">${i}</button>`;
    }
    html += `<button class="btn btn-sm btn-outline-success" ${actual === totalPaginas ? 'disabled' : ''} data-accion="ir-pagina" data-pagina="${actual + 1}">Siguiente →</button>`;
    cont.innerHTML = html;
}

function irPagina(p) { paginaVentas = p; cargarVentas(); }

function aplicarFiltros() { paginaVentas = 1; cargarVentas(); }

// ── Detalle (modal) ──
async function verDetalle(idPedido) {
    try {
        const token = localStorage.getItem('token');
        const res  = await fetch('/api/ventas/' + idPedido, { headers: { 'Authorization': 'Bearer ' + token } });
        if (!res.ok) throw new Error('No se pudo cargar el detalle');
        const data = await res.json();
        const c = data.comprobante;
        idPedidoDetalleActual = idPedido;

        document.getElementById('detalle-cabecera').innerHTML = `
            <div class="col-md-6">
                <p class="mb-1"><strong>N° Pedido:</strong> #${idPedido}</p>
                <p class="mb-1"><strong>Comprobante:</strong> ${c.tipo} ${c.numero}</p>
                <p class="mb-1"><strong>Fecha:</strong> ${new Date(c.fecha).toLocaleString('es-PE')}</p>
            </div>
            <div class="col-md-6 text-md-end">
                <p class="mb-1"><strong>Cliente:</strong> ${c.cliente}</p>
                ${c.documento ? `<p class="mb-1"><strong>${c.documento}</strong></p>` : ''}
            </div>`;

        // ── Detalle de entrega: tipo, dirección y contacto real ──
        // El "Cliente" de arriba puede ser la razón social (en factura),
        // así que aquí se muestra siempre la PERSONA real de contacto
        // (contacto_nombre/contacto_telefono), sin importar boleta/factura.
        const esRecojo = c.tipo_entrega === 'RECOJO_TIENDA';
        document.getElementById('detalle-entrega').innerHTML = `
            <p class="mb-2 fw-bold text-success"><i class="bi bi-${esRecojo ? 'shop' : 'truck'} me-1"></i>Detalle de entrega</p>
            <p class="mb-1">
                <strong>Tipo:</strong>
                <span class="badge ${esRecojo ? 'bg-secondary' : 'bg-primary'}">
                    ${esRecojo ? 'Recojo en tienda' : 'Delivery'}
                </span>
            </p>
            ${c.direccion_entrega ? `<p class="mb-1"><strong>Dirección:</strong> ${c.direccion_entrega}</p>` : ''}
            ${!esRecojo ? `<p class="mb-1"><strong>Costo de envío:</strong> ${soles(c.costo_envio)}</p>` : ''}
            <p class="mb-1"><strong>${esRecojo ? 'Quién recoge' : 'Quién recibe'}:</strong> ${c.contacto_nombre || '—'}</p>
            <p class="mb-0"><strong>Teléfono:</strong> ${c.contacto_telefono || 'No registrado'}</p>`;

        document.getElementById('det-estado-select').value = c.estado || 'PENDIENTE';

        document.getElementById('detalle-productos').innerHTML = data.productos.length
            ? data.productos.map(p => `
                <tr>
                    <td>${p.producto}</td>
                    <td class="text-center">${p.cantidad}</td>
                    <td class="text-end">${soles(p.precio_unitario)}</td>
                    <td class="text-end">${soles(p.subtotal)}</td>
                    <td>${p.color || '-'}</td>
                    <td>${p.talla || '-'}</td>
                </tr>`).join('')
            : '<tr><td colspan="6" class="text-center text-muted">Sin productos</td></tr>';

        document.getElementById('det-subtotal').innerText = soles(data.totales.subtotal);
        document.getElementById('det-igv').innerText      = soles(data.totales.igv);
        document.getElementById('det-total').innerText    = soles(data.totales.total);

        modalDetalle.show();
    } catch (err) {
        mostrarAlerta('Error al cargar el detalle: ' + err.message, 'error');
    }
}

// ── Cambiar estado desde el modal de detalle ──
async function cambiarEstadoDetalle(nuevoEstado) {
    if (!idPedidoDetalleActual) return;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/pedidos/${idPedidoDetalleActual}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ estado: nuevoEstado })
        });
        if (!res.ok) throw new Error('No se pudo actualizar el estado');
        mostrarAlerta(`Pedido #${idPedidoDetalleActual} → ${nuevoEstado}`, 'exito');
        cargarVentas();
    } catch (err) {
        mostrarAlerta('Error al cambiar estado: ' + err.message, 'error');
    }
}

// ── Cambiar estado directo desde el <select> de la tabla (sin abrir el modal) ──
// Mismo endpoint PUT /api/pedidos/:id/estado que ya usa el modal de detalle.
async function cambiarEstadoFila(idPedido, nuevoEstado, selectEl) {
    const anterior = selectEl.dataset.anterior;
    selectEl.disabled = true;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/pedidos/${idPedido}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ estado: nuevoEstado })
        });
        if (!res.ok) throw new Error('No se pudo actualizar el estado');

        // Éxito: se actualiza el color y se guarda el nuevo valor como
        // "anterior" para la próxima vez.
        selectEl.style.background = ESTADOS_COLOR_FONDO[nuevoEstado] || '#e9ecef';
        selectEl.dataset.anterior = nuevoEstado;
        mostrarAlerta(`Pedido #${idPedido} → ${nuevoEstado}`, 'exito');
    } catch (err) {
        // Falla: se revierte la selección al valor que tenía antes,
        // para que la tabla no muestre un estado que no se guardó.
        selectEl.value = anterior;
        mostrarAlerta('Error al cambiar estado: ' + err.message, 'error');
    } finally {
        selectEl.disabled = false;
    }
}

// ── Exportar a Excel ──
async function exportarVentas(btn) {
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Generando...';
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/ventas/exportar-excel?' + queryString(), { headers: { 'Authorization': 'Bearer ' + token } });
        if (!res.ok) throw new Error('No se pudo exportar');
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = 'ventas.xlsx';
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
    } catch (err) {
        mostrarAlerta('Error al exportar: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const nombre = localStorage.getItem('nombre');
    if (nombre) document.getElementById('nombre-admin').innerText = nombre;
    modalDetalle = new bootstrap.Modal(document.getElementById('modalDetalle'));
    document.getElementById('det-estado-select')
        .addEventListener('change', (e) => cambiarEstadoDetalle(e.target.value));
    document.getElementById('filtro-codigo')
        .addEventListener('keydown', (e) => { if (e.key === 'Enter') aplicarFiltros(); });
    pintarOpcionesEstado();
    cargarVentas();
});


// ═══════════════════════════════════════════════════
//  Cambio de estado desde la tabla — los <select> se generan
//  dinámicamente en cada render de cargarVentas(), así que se
//  escucha por delegación en vez de enlazar uno por fila.
// ═══════════════════════════════════════════════════
document.addEventListener('change', function (e) {
    const el = e.target.closest('.estado-select');
    if (!el) return;
    cambiarEstadoFila(Number(el.dataset.id), el.value, el);
});

// ═══════════════════════════════════════════════════
//  DESPACHADOR DE EVENTOS (mismo patrón que dashboard.js/index.js)
// ═══════════════════════════════════════════════════
document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-accion]');
    if (!el) return;
    if (el.tagName === 'A') e.preventDefault();

    switch (el.dataset.accion) {
        case 'cerrar-sesion':    cerrarSesion(); break;
        case 'aplicar-filtros':  aplicarFiltros(); break;
        case 'exportar-ventas':  exportarVentas(el); break;
        case 'ver-detalle':      verDetalle(Number(el.dataset.id)); break;
        case 'ir-pagina':        irPagina(Number(el.dataset.pagina)); break;
        case 'cambiar-vista':          cambiarVista(el.dataset.vista); break;
        case 'cambiar-tipo-entrega':    cambiarTipoEntrega(el.dataset.tipo); break;
    }
});
