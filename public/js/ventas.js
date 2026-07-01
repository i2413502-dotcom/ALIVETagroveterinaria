// ── Auth guard: solo COLABORADOR ──
(function () {
    const token = localStorage.getItem('token');
    const rol   = localStorage.getItem('rol');
    if (!token || rol !== 'COLABORADOR') { window.location.href = '/login.html'; }
})();

let paginaVentas = 1;
let modalDetalle = null;

const soles = n => 'S/. ' + (Number(n) || 0).toFixed(2);

function cerrarSesion() {
    ['token', 'rol', 'nombre'].forEach(k => localStorage.removeItem(k));
    window.location.href = '/login.html';
}

function badgeEstado(estado) {
    const c = { PAGADO: 'info text-dark', ENTREGADO: 'success' };
    return `<span class="badge bg-${c[estado] || 'secondary'}">${estado}</span>`;
}

function filtrosActuales() {
    return {
        estado: document.getElementById('filtro-estado').value,
        desde:  document.getElementById('filtro-desde').value,
        hasta:  document.getElementById('filtro-hasta').value
    };
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
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay ventas</td></tr>';
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
                <td>${badgeEstado(v.estado)}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-success" title="Ver detalle" onclick="verDetalle(${v.id_pedido})">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            </tr>`).join('');

        renderPaginacion(data);
    } catch (err) {
        console.error('Error cargando ventas:', err);
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error al cargar ventas</td></tr>';
    }
}

function renderPaginacion(data) {
    const cont = document.getElementById('paginacion-ventas');
    const totalPaginas = data.totalPaginas || 1;
    const actual       = data.pagina || 1;
    if (totalPaginas <= 1) { cont.innerHTML = ''; return; }

    let html = `<span class="text-muted small me-2">Página ${actual} de ${totalPaginas} (${data.total} ventas)</span>`;
    html += `<button class="btn btn-sm btn-outline-success" ${actual === 1 ? 'disabled' : ''} onclick="irPagina(${actual - 1})">← Anterior</button>`;
    const ini = Math.max(1, actual - 2);
    const fin = Math.min(totalPaginas, ini + 4);
    for (let i = ini; i <= fin; i++) {
        html += `<button class="btn btn-sm ${i === actual ? 'btn-success' : 'btn-outline-success'}" onclick="irPagina(${i})">${i}</button>`;
    }
    html += `<button class="btn btn-sm btn-outline-success" ${actual === totalPaginas ? 'disabled' : ''} onclick="irPagina(${actual + 1})">Siguiente →</button>`;
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

        document.getElementById('detalle-cabecera').innerHTML = `
            <div class="col-md-6">
                <p class="mb-1"><strong>Comprobante:</strong> ${c.tipo} ${c.numero}</p>
                <p class="mb-1"><strong>Fecha:</strong> ${new Date(c.fecha).toLocaleString('es-PE')}</p>
            </div>
            <div class="col-md-6 text-md-end">
                <p class="mb-1"><strong>Cliente:</strong> ${c.cliente}</p>
                ${c.documento ? `<p class="mb-1"><strong>${c.documento}</strong></p>` : ''}
            </div>`;

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
        alert('Error al cargar el detalle: ' + err.message);
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
        alert('Error al exportar: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = original;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const nombre = localStorage.getItem('nombre');
    if (nombre) document.getElementById('nombre-admin').innerText = nombre;
    modalDetalle = new bootstrap.Modal(document.getElementById('modalDetalle'));
    cargarVentas();
});
