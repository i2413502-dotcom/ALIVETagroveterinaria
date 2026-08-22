// ── Auth guard: solo COLABORADOR ──
(function () {
    const token = localStorage.getItem('token');
    const rol   = localStorage.getItem('rol');
    if (!token || rol !== 'COLABORADOR') { window.location.href = '/login.html'; }
})();

const soles = n => 'S/. ' + (Number(n) || 0).toFixed(2);

function cerrarSesion() {
    ['token', 'rol', 'nombre'].forEach(k => localStorage.removeItem(k));
    window.location.href = '/login.html';
}

// El pedido pasa de Pagado -> Enviado -> Entregado. Al marcarlo
// Entregado desaparece de esta lista (ya no cumple el filtro del backend).
const ESTADOS_PASO = ['PAGADO', 'ENVIADO', 'ENTREGADO'];

function selectEstado(idPedido, estadoActual) {
    const opciones = ESTADOS_PASO.map(e =>
        `<option value="${e}" ${e === estadoActual ? 'selected' : ''}>${e}</option>`
    ).join('');
    return `<select class="form-select form-select-sm estado-select"
                     data-id="${idPedido}" data-anterior="${estadoActual}" style="font-weight:600;">
                ${opciones}
            </select>`;
}

function tarjetaPedido(p) {
    const esRecojo   = p.tipo_entrega === 'RECOJO_TIENDA';
    const claseCard  = p.estado === 'ENVIADO' ? 'es-enviado' : 'es-pagado';
    const pillTipo   = esRecojo
        ? '<span class="tipo-pill recojo"><i class="bi bi-shop me-1"></i>Recojo en Tienda</span>'
        : '<span class="tipo-pill delivery"><i class="bi bi-truck me-1"></i>Delivery</span>';

    // El campo de repartidor solo tiene sentido para Delivery
    const bloqueRepartidor = esRecojo ? '' : `
        <div class="d-flex align-items-center gap-2 mt-2">
            <i class="bi bi-person-badge text-muted"></i>
            <input type="text" class="form-control form-control-sm repartidor-input"
                   data-id="${p.id_pedido}" data-anterior="${p.repartidor || ''}"
                   value="${p.repartidor || ''}" placeholder="Nombre del repartidor">
            <button class="btn btn-sm btn-outline-success" title="Guardar repartidor"
                    data-accion="guardar-repartidor" data-id="${p.id_pedido}">
                <i class="bi bi-check2"></i>
            </button>
        </div>`;

    const detalle = esRecojo
        ? (p.direccion_entrega || 'Recojo en tienda')
        : `${p.direccion_entrega || '—'}${p.distrito ? ' · ' + p.distrito : ''}`;

    return `
        <div class="entrega-card ${claseCard}">
            <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
                <div>
                    <div class="d-flex align-items-center gap-2 mb-1">
                        <strong>#${p.id_pedido}</strong>
                        ${pillTipo}
                    </div>
                    <div class="fw-bold">${p.cliente || '—'}</div>
                    <div class="text-muted small">${p.telefono ? '📞 ' + p.telefono + ' · ' : ''}${detalle}</div>
                </div>
                <div class="text-end">
                    <div class="fw-bold text-success mb-1">${soles(p.total)}</div>
                    ${selectEstado(p.id_pedido, p.estado)}
                </div>
            </div>
            ${bloqueRepartidor}
        </div>`;
}

// ── Cargar lista, sin filtros ──
async function cargarEntregas() {
    const cont = document.getElementById('lista-entregas');
    try {
        const token = localStorage.getItem('token');
        const res  = await fetch('/api/despachos', { headers: { 'Authorization': 'Bearer ' + token } });
        const data = await res.json();

        if (!data.pedidos || !data.pedidos.length) {
            cont.innerHTML = '<p class="text-center text-muted py-4"><i class="bi bi-check2-circle fs-3 d-block mb-2"></i>No hay pedidos pendientes de entregar 🎉</p>';
            return;
        }
        cont.innerHTML = data.pedidos.map(tarjetaPedido).join('');
    } catch (err) {
        console.error('Error cargando pendientes de entrega:', err);
        cont.innerHTML = '<p class="text-center text-danger">Error al cargar la lista</p>';
    }
}

// ── Cambiar estado (mismo endpoint que usa Ventas) ──
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
        mostrarAlerta(`Pedido #${idPedido} → ${nuevoEstado}`, 'exito');
        cargarEntregas();
    } catch (err) {
        selectEl.value = anterior;
        selectEl.disabled = false;
        mostrarAlerta('Error al cambiar estado: ' + err.message, 'error');
    }
}

// ── Guardar repartidor asignado ──
async function guardarRepartidor(idPedido, btn) {
    const input = document.querySelector(`.repartidor-input[data-id="${idPedido}"]`);
    const valor = input.value.trim();
    btn.disabled = true;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/despachos/${idPedido}/repartidor`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ repartidor: valor })
        });
        if (!res.ok) throw new Error('No se pudo guardar');
        input.dataset.anterior = valor;
        mostrarAlerta(`Repartidor asignado al pedido #${idPedido}`, 'exito');
    } catch (err) {
        input.value = input.dataset.anterior;
        mostrarAlerta('Error al asignar repartidor: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const nombre = localStorage.getItem('nombre');
    if (nombre) document.getElementById('nombre-admin').innerText = nombre;
    cargarEntregas();
});

document.addEventListener('change', function (e) {
    const el = e.target.closest('.estado-select');
    if (!el) return;
    cambiarEstadoFila(Number(el.dataset.id), el.value, el);
});

document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-accion]');
    if (!el) return;
    if (el.tagName === 'A') e.preventDefault();

    switch (el.dataset.accion) {
        case 'cerrar-sesion':        cerrarSesion(); break;
        case 'guardar-repartidor':   guardarRepartidor(Number(el.dataset.id), el); break;
    }
});
