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

// ── KPIs ──
async function cargarResumen() {
    try {
        const res  = await fetch('/api/reportes/resumen', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
        const data = await res.json();
        document.getElementById('kpi-ventas-hoy').innerText = soles(data.ventasHoy);
        document.getElementById('kpi-ventas-mes').innerText = soles(data.ventasMes);
        document.getElementById('kpi-productos').innerText  = data.productosActivos;
        document.getElementById('kpi-alertas').innerText    = data.alertasStock;
    } catch (err) { console.error('Error resumen:', err); }
}

// ── Gráfico de barras: ventas por categoría ──
async function cargarVentasPorCategoria() {
    try {
        const res  = await fetch('/api/reportes/ventas-por-categoria', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
        const data = await res.json();
        const ctx  = document.getElementById('chartCategorias').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.categoria),
                datasets: [{
                    label: 'Ventas (S/.)',
                    data: data.map(d => Number(d.total)),
                    backgroundColor: 'rgba(6,160,73,0.75)',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { callback: v => 'S/. ' + v } } }
            }
        });
    } catch (err) { console.error('Error gráfico categorías:', err); }
}

// ── Tabla: productos con stock bajo ──
async function cargarStockBajo() {
    try {
        const res  = await fetch('/api/reportes/productos-stock-bajo', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
        const data = await res.json();
        const tbody = document.getElementById('tabla-stock-bajo');
        if (!data.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Sin alertas de stock 🎉</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(p => `
            <tr>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.categoria}</td>
                <td class="text-center"><span class="badge bg-danger">${p.stock_actual}</span></td>
                <td class="text-center text-muted">${p.stock_minimo}</td>
            </tr>`).join('');
    } catch (err) { console.error('Error stock bajo:', err); }
}

// ── Exportaciones: descarga vía Blob ──
async function exportar(endpoint, filename, btn) {
    const original = btn ? btn.innerHTML : null;
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Generando...'; }
    try {
        const res = await fetch('/api/reportes/exportar/' + endpoint, { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
        if (!res.ok) throw new Error('No se pudo generar el archivo');
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (err) {
        mostrarAlerta('Error al exportar: ' + err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = original; }
    }
}

// Llena el select de años con el actual + los 4 anteriores (suficiente
// para el historial normal de la tienda; si hace falta más, se agranda
// este rango a mano).
function llenarSelectAnioVentas() {
    const sel = document.getElementById('ventas-pdf-anio');
    if (!sel) return;
    const actual = new Date().getFullYear();
    for (let a = actual; a >= actual - 4; a--) {
        sel.insertAdjacentHTML('beforeend', `<option value="${a}">${a}</option>`);
    }
}

const NOMBRES_MES = ['', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Descarga el PDF de ventas, con el filtro de mes/año que haya elegido
// (si deja ambos en blanco, trae todo el historial, igual que antes).
async function exportarVentasPdf(btn) {
    const mes  = document.getElementById('ventas-pdf-mes').value;
    const anio = document.getElementById('ventas-pdf-anio').value;

    const params = new URLSearchParams();
    if (mes)  params.set('mes', mes);
    if (anio) params.set('anio', anio);

    let nombreArchivo = 'reporte-ventas.pdf';
    if (mes && anio)      nombreArchivo = `reporte-ventas-${NOMBRES_MES[mes]}-${anio}.pdf`;
    else if (anio)        nombreArchivo = `reporte-ventas-${anio}.pdf`;
    else if (mes)         nombreArchivo = `reporte-ventas-${NOMBRES_MES[mes]}.pdf`;

    const endpoint = 'ventas-pdf' + (params.toString() ? '?' + params.toString() : '');
    await exportar(endpoint, nombreArchivo, btn);
}

window.addEventListener('DOMContentLoaded', () => {
    const nombre = localStorage.getItem('nombre');
    if (nombre) document.getElementById('nombre-admin').innerText = nombre;
    cargarResumen();
    cargarVentasPorCategoria();
    cargarStockBajo();
    llenarSelectAnioVentas();
});

// ═══════════════════════════════════════════════════
//  DESPACHADOR DE EVENTOS (mismo patrón que dashboard.js/index.js)
// ═══════════════════════════════════════════════════
document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-accion]');
    if (!el) return;
    if (el.tagName === 'A') e.preventDefault();

    switch (el.dataset.accion) {
        case 'cerrar-sesion': cerrarSesion(); break;
        case 'exportar':      exportar(el.dataset.endpoint, el.dataset.archivo, el); break;
        case 'exportar-ventas-pdf': exportarVentasPdf(el); break;
    }
});
