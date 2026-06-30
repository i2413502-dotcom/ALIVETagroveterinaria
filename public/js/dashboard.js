// ═══════════════════════════════════════════════════
//  AUTH GUARD — ejecuta antes que cualquier otra cosa
// ═══════════════════════════════════════════════════
(function() {
    const token = localStorage.getItem('token');
    const rol   = localStorage.getItem('rol');
    if (!token || rol !== 'COLABORADOR') { window.location.href = '/login.html'; }
})();

// ═══════════════════════════════════════════════════
//  VARIABLES GLOBALES
// ══════════════════════════════════════════════════
let modalProducto, modalCategoria, modalAnimal, modalColaborador;
let productosLista = [], categoriasLista = [], animalesLista = [], colaboradoresLista = [];
let chartVentas = null, chartProductos = null, chartStock = null;
let intervaloPedidos = null;
let ultimosPedidosIds = new Set();
let paginaProductos = 1;
const LIMITE_PRODUCTOS = 20;

// ═══════════════════════════════════════════════════
//  ACCESO
// ═══════════════════════════════════════════════════
function verificarAcceso() {
    const token = localStorage.getItem('token');
    const rol   = localStorage.getItem('rol');
    if (!token || rol !== 'COLABORADOR') { window.location.href = '/login.html'; return; }
    const nombre = localStorage.getItem('nombre');
    if (nombre) document.getElementById('nombre-admin').innerText = nombre;
}

// ═══════════════════════════════════════════════════
//  NAVEGACIÓN
// ═══════════════════════════════════════════════════
function mostrarSeccion(seccion, link) {
    const secciones = ['inicio','pedidos','productos','clientes','categorias','animales','colaboradores'];
    secciones.forEach(s => document.getElementById('seccion-'+s).classList.add('d-none'));
    document.getElementById('seccion-'+seccion).classList.remove('d-none');

    const titulos = {
        inicio:'Dashboard', pedidos:'Gestión de Pedidos',
        productos:'Inventario de Productos', clientes:'Clientes Registrados',
        categorias:'Categorías de Producto', animales:'Tipos de Animal',
        colaboradores:'Colaboradores'
    };
    document.getElementById('titulo-seccion').innerText = titulos[seccion];
    document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
    if (link) link.classList.add('active');

    if (seccion === 'pedidos')       { cargarPedidos(); document.getElementById('badge-nuevos').classList.add('d-none'); }
    if (seccion === 'productos')     cargarProductos();
    if (seccion === 'clientes')      cargarClientes();
    if (seccion === 'categorias')    cargarCategorias();
    if (seccion === 'animales')      cargarAnimales();
    if (seccion === 'colaboradores') cargarColaboradores();
}

function cerrarSesion() {
    if (intervaloPedidos) clearInterval(intervaloPedidos);
    ['token','rol','nombre'].forEach(k => localStorage.removeItem(k));
    window.location.href = '/login.html';
}

// Exportar el contenido de un tab (entidad) en el formato dado: excel | pdf | powerbi
async function exportarTabla(entidad, formato) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/reportes/exportar/${entidad}/${formato}`, { headers: { 'Authorization': 'Bearer ' + token } });
        if (!res.ok) {
            const e = await res.json().catch(() => ({}));
            throw new Error(e.mensaje || 'No se pudo exportar');
        }
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        const ext  = formato === 'pdf' ? 'pdf' : 'xlsx';
        const suf  = formato === 'powerbi' ? '-powerbi' : '';
        a.href = url;
        a.download = `${entidad}${suf}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (err) {
        alert('Error al exportar: ' + err.message);
    }
}

// ═══════════════════════════════════════════════════
//  ESTADÍSTICAS
// ═══════════════════════════════════════════════════
async function cargarEstadisticas() {
    try {
        const token = localStorage.getItem('token');
        const res  = await fetch('/api/dashboard', { headers: { 'Authorization': 'Bearer ' + token } });
        const data = await res.json();
        document.getElementById('stat-clientes').innerText   = data.clientes;
        document.getElementById('stat-pendientes').innerText = data.pedidosPendientes;
        document.getElementById('stat-productos').innerText  = data.productos;
        document.getElementById('stat-ventas').innerText     = 'S/. ' + parseFloat(data.ventasTotal || 0).toFixed(2);
    } catch (err) { console.error('Error estadísticas:', err); }
}

// ═══════════════════════════════════════════════════
//  GRÁFICO — VENTAS POR MES
// ═══════════════════════════════════════════════════
async function cargarGraficoVentas() {
    try {
        const token = localStorage.getItem('token');
        const res  = await fetch('/api/dashboard/ventas-mes', { headers: { 'Authorization': 'Bearer ' + token } });
        const data = await res.json();
        const ctx  = document.getElementById('chartVentas').getContext('2d');
        if (chartVentas) chartVentas.destroy();
        chartVentas = new Chart(ctx, {
            type: 'line',
            data: {
                labels:   data.map(d => d.mes_label),
                datasets: [{
                    label:           'Ventas (S/.)',
                    data:            data.map(d => parseFloat(d.total_ventas)),
                    borderColor:     '#06A049',
                    backgroundColor: 'rgba(6,160,73,0.1)',
                    borderWidth:     3,
                    fill:            true,
                    tension:         0.4,
                    pointBackgroundColor: '#06A049',
                    pointRadius:     5
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => 'S/. '+v } }
                }
            }
        });
    } catch (err) { console.error('Error gráfico ventas:', err); }
}

// ═══════════════════════════════════════════════════
//  GRÁFICO — PRODUCTOS MÁS VENDIDOS
// ═══════════════════════════════════════════════════
async function cargarGraficoProductos() {
    try {
        const token = localStorage.getItem('token');
        const res  = await fetch('/api/dashboard/productos-vendidos', { headers: { 'Authorization': 'Bearer ' + token } });
        const data = await res.json();
        const ctx  = document.getElementById('chartProductos').getContext('2d');
        if (chartProductos) chartProductos.destroy();
        const colores = ['#06A049','#28a745','#17a2b8','#ffc107','#fd7e14'];
        chartProductos = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels:   data.map(d => d.nombre),
                datasets: [{
                    data:            data.map(d => d.total_vendido),
                    backgroundColor: colores,
                    borderWidth:     2
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom', labels: { font: { size: 11 } } } }
            }
        });
    } catch (err) { console.error('Error gráfico productos:', err); }
}

// ═══════════════════════════════════════════════════
//  GRÁFICO — STOCK
// ═══════════════════════════════════════════════════
async function cargarGraficoStock() {
    try {
        const token = localStorage.getItem('token');
        const res  = await fetch('/api/dashboard/stock', { headers: { 'Authorization': 'Bearer ' + token } });
        const data = await res.json();
        const ctx  = document.getElementById('chartStock').getContext('2d');
        if (chartStock) chartStock.destroy();
        chartStock = new Chart(ctx, {
            type: 'bar',
            data: {
                labels:   data.map(d => d.nombre.length > 15 ? d.nombre.substring(0,15)+'…' : d.nombre),
                datasets: [
                    {
                        label:           'Stock Actual',
                        data:            data.map(d => d.stock_actual),
                        backgroundColor: data.map(d => d.stock_actual <= d.stock_minimo ? 'rgba(220,53,69,0.7)' : 'rgba(6,160,73,0.7)'),
                        borderRadius:    4
                    },
                    {
                        label:           'Stock Mínimo',
                        data:            data.map(d => d.stock_minimo),
                        backgroundColor: 'rgba(255,193,7,0.5)',
                        borderRadius:    4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true } }
            }
        });
    } catch (err) { console.error('Error gráfico stock:', err); }
}

// ═══════════════════════════════════════════════════
//  HELPER — badge estado pedido
// ═══════════════════════════════════════════════════
function getBadgeEstado(estado) {
    const c = { PENDIENTE:'warning text-dark', PAGADO:'info text-dark',
                ENVIADO:'primary', ENTREGADO:'success', CANCELADO:'danger' };
    return c[estado] || 'secondary';
}

// ═══════════════════════════════════════════════════
//  PEDIDOS RECIENTES (inicio)
// ═══════════════════════════════════════════════════
async function cargarPedidosRecientes() {
    try {
        const token   = localStorage.getItem('token');
        const res     = await fetch('/api/pedidos', { headers: { 'Authorization':'Bearer '+token } });
        const pedidos = await res.json();
        const recientes = pedidos.slice(0, 5);
        const tbody   = document.getElementById('tabla-pedidos-recientes');
        if (!recientes.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay pedidos</td></tr>';
            return;
        }
        tbody.innerHTML = recientes.map(p => `
            <tr>
                <td><strong>#${p.id_pedido}</strong></td>
                <td>${p.cliente_nombre}</td>
                <td class="text-success fw-bold">S/. ${parseFloat(p.total).toFixed(2)}</td>
                <td><span class="badge bg-${getBadgeEstado(p.estado)}">${p.estado}</span></td>
                <td>
                    <select class="form-select form-select-sm" style="width:120px"
                            onchange="actualizarEstado(${p.id_pedido}, this.value)">
                        <option ${p.estado==='PENDIENTE'?'selected':''}>PENDIENTE</option>
                        <option ${p.estado==='PAGADO'   ?'selected':''}>PAGADO</option>
                        <option ${p.estado==='ENVIADO'  ?'selected':''}>ENVIADO</option>
                        <option ${p.estado==='ENTREGADO'?'selected':''}>ENTREGADO</option>
                        <option ${p.estado==='CANCELADO'?'selected':''}>CANCELADO</option>
                    </select>
                </td>
            </tr>`).join('');
    } catch (err) { console.error('Error pedidos recientes:', err); }
}

// ═══════════════════════════════════════════════════
//  PEDIDOS — sección completa + polling automático
// ═══════════════════════════════════════════════════
async function cargarPedidos() {
    try {
        const token   = localStorage.getItem('token');
        const res     = await fetch('/api/pedidos', { headers: { 'Authorization':'Bearer '+token } });
        const pedidos = await res.json();
        const tbody   = document.getElementById('tabla-pedidos');
        if (!pedidos.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay pedidos</td></tr>';
            return;
        }
        tbody.innerHTML = pedidos.map(p => `
            <tr id="fila-pedido-${p.id_pedido}" class="${!ultimosPedidosIds.has(p.id_pedido) && ultimosPedidosIds.size > 0 ? 'table-warning' : ''}">
                <td><strong>#${p.id_pedido}</strong></td>
                <td>${p.cliente_nombre}</td>
                <td>${p.direccion_entrega}</td>
                <td class="text-success fw-bold">S/. ${parseFloat(p.total).toFixed(2)}</td>
                <td><span class="badge bg-${getBadgeEstado(p.estado)}">${p.estado}</span></td>
                <td>${new Date(p.fecha_pedido).toLocaleDateString('es-PE')}</td>
                <td>
                    <select class="form-select form-select-sm" style="width:120px"
                            onchange="actualizarEstado(${p.id_pedido}, this.value)">
                        <option ${p.estado==='PENDIENTE'?'selected':''}>PENDIENTE</option>
                        <option ${p.estado==='PAGADO'   ?'selected':''}>PAGADO</option>
                        <option ${p.estado==='ENVIADO'  ?'selected':''}>ENVIADO</option>
                        <option ${p.estado==='ENTREGADO'?'selected':''}>ENTREGADO</option>
                        <option ${p.estado==='CANCELADO'?'selected':''}>CANCELADO</option>
                    </select>
                </td>
            </tr>`).join('');
        ultimosPedidosIds = new Set(pedidos.map(p => p.id_pedido));
    } catch (err) { console.error('Error cargando pedidos:', err); }
}

// Polling — revisa nuevos pedidos cada 30 segundos
async function verificarNuevosPedidos() {
    try {
        const token   = localStorage.getItem('token');
        if (!token) return;
        const res     = await fetch('/api/pedidos', { headers: { 'Authorization':'Bearer '+token } });
        const pedidos = await res.json();
        const nuevos  = pedidos.filter(p => !ultimosPedidosIds.has(p.id_pedido));
        if (nuevos.length > 0 && ultimosPedidosIds.size > 0) {
            const badge = document.getElementById('badge-nuevos');
            badge.innerText = nuevos.length;
            badge.classList.remove('d-none');
            // Actualizar pedidos recientes en inicio si está visible
            const secInicio = document.getElementById('seccion-inicio');
            if (!secInicio.classList.contains('d-none')) cargarPedidosRecientes();
        }
        if (ultimosPedidosIds.size === 0) {
            ultimosPedidosIds = new Set(pedidos.map(p => p.id_pedido));
        }
    } catch (e) {}
}

async function actualizarEstado(id, estado) {
    try {
        const token = localStorage.getItem('token');
        await fetch(`/api/pedidos/${id}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+token },
            body: JSON.stringify({ estado })
        });
        cargarEstadisticas();
    } catch (err) { console.error('Error actualizando estado:', err); }
}

// ═══════════════════════════════════════════════════
//  PRODUCTOS
// ═══════════════════════════════════════════════════
async function cargarProductos() {
    try {
        // incluirInactivos=1 → el panel admin ve también los desactivados (el catálogo público no)
        // Paginación del lado del servidor (igual que el catálogo público)
        const res  = await fetch(`/api/productos?incluirInactivos=1&pagina=${paginaProductos}&limite=${LIMITE_PRODUCTOS}`);
        const data = await res.json();
        productosLista = data.productos || [];
        const tbody = document.getElementById('tabla-productos');
        if (!productosLista.length) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No hay productos</td></tr>';
            renderPaginacionProductos({ pagina: 1, totalPaginas: 1, total: 0 });
            return;
        }
        tbody.innerHTML = productosLista.map(p => {
            const stockEstado = p.stock_actual <= p.stock_minimo
                ? '<span class="badge bg-danger">Stock Bajo</span>'
                : '<span class="badge bg-success">Normal</span>';
            const imgSrc = p.imagen
                ? (p.imagen.startsWith('http') ? p.imagen : `/img/productos/${p.imagen}`)
                : '/img/logo.jpeg';

            const inactivo = p.estado === 'INACTIVO';

            // Enlace a ficha técnica (fuera del botón de editar)
            const fichaBtn = p.ficha_tecnica ? `
                    <a href="${convertirUrlDrive(p.ficha_tecnica)}" target="_blank"
                       class="btn btn-sm btn-outline-secondary me-1" title="Ver Ficha Técnica">
                        <i class="bi bi-file-earmark-pdf"></i>
                    </a>` : '';

            // Botón cambiar estado: si está activo → desactivar; si está inactivo → activar
            const toggleBtn = inactivo
                ? `<button class="btn btn-sm btn-outline-success me-1" title="Activar producto"
                           onclick="cambiarEstadoProducto(${p.id_producto}, 'ACTIVO')">
                        <i class="bi bi-toggle-off"></i>
                   </button>`
                : `<button class="btn btn-sm btn-outline-warning me-1" title="Desactivar producto"
                           onclick="cambiarEstadoProducto(${p.id_producto}, 'INACTIVO')">
                        <i class="bi bi-toggle-on"></i>
                   </button>`;

            return `
            <tr class="${inactivo ? 'opacity-50' : ''}">
                <td>${p.id_producto}</td>
                <td><img src="${imgSrc}" alt="img" style="width:45px;height:45px;object-fit:cover;border-radius:8px;"
                         onerror="this.onerror=null;this.src='/img/logo.jpeg';"></td>
                <td><strong>${p.nombre}</strong>${inactivo ? ' <span class="badge bg-secondary ms-1">Inactivo</span>' : ''}</td>
                <td>${p.categoria || '-'}</td>
                <td>${p.tipo_animal || '-'}</td>
                <td class="text-success fw-bold">S/. ${parseFloat(p.precio_venta).toFixed(2)}</td>
                <td>${p.stock_actual}</td>
                <td>${stockEstado}</td>
                <td class="text-nowrap">
                    ${fichaBtn}
                    <button class="btn btn-sm btn-outline-primary me-1" title="Editar producto" onclick="editarProducto(${p.id_producto})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    ${toggleBtn}
                    <button class="btn btn-sm btn-outline-danger" title="Eliminar permanentemente" onclick="eliminarProducto(${p.id_producto})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>`;
        }).join('');
        renderPaginacionProductos(data);
    } catch (err) { console.error('Error cargando productos:', err); }
}

// Paginación de la tabla de productos (servidor)
function renderPaginacionProductos(data) {
    const cont = document.getElementById('paginacion-productos');
    if (!cont) return;
    const totalPaginas = data.totalPaginas || 1;
    const actual       = data.pagina || 1;
    if (totalPaginas <= 1) { cont.innerHTML = ''; return; }

    let html = `<span class="text-muted small me-2">Página ${actual} de ${totalPaginas} (${data.total} productos)</span>`;
    html += `<button class="btn btn-sm btn-outline-success" ${actual === 1 ? 'disabled' : ''} onclick="irPaginaProductos(${actual - 1})">← Anterior</button>`;
    const ini = Math.max(1, actual - 2);
    const fin = Math.min(totalPaginas, ini + 4);
    for (let i = ini; i <= fin; i++) {
        html += `<button class="btn btn-sm ${i === actual ? 'btn-success' : 'btn-outline-success'}" onclick="irPaginaProductos(${i})">${i}</button>`;
    }
    html += `<button class="btn btn-sm btn-outline-success" ${actual === totalPaginas ? 'disabled' : ''} onclick="irPaginaProductos(${actual + 1})">Siguiente →</button>`;
    cont.innerHTML = html;
}

function irPaginaProductos(p) {
    paginaProductos = p;
    cargarProductos();
}

// Reset COMPLETO del formulario de producto (inputs, selects y campos dinámicos)
function limpiarFormularioProducto() {
    const ids = [
        'prod-id','prod-nombre','prod-descripcion','prod-precio','prod-stock',
        'prod-imagen-file','prod-imagen-url','prod-imagen-final',
        'prod-categoria','prod-animal',
        // medicamento
        'prod-marca-med','prod-presentacion','prod-vencimiento','prod-composicion','prod-modo-uso','prod-ficha-tecnica',
        // accesorio
        'prod-marca-acc','prod-ficha-acc',
        // alimento
        'prod-marca-ali','prod-peso-ali','prod-vencimiento-ali','prod-composicion-ali','prod-ficha-ali'
    ];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

    document.getElementById('preview-container')?.classList.add('d-none');
    document.getElementById('ficha-preview')?.classList.add('d-none');
    const fuente = document.getElementById('ficha-fuente'); if (fuente) fuente.innerHTML = '';

    limpiarTags();

    // Ocultar las secciones dinámicas por categoría
    ['campos-medicamento','campos-accesorio','campos-alimento'].forEach(id => {
        const el = document.getElementById(id); if (el) el.style.display = 'none';
    });
}

async function mostrarModalProducto() {
    document.getElementById('modal-titulo').innerText = 'Nuevo Producto';
    await cargarSelectCategorias();
    await cargarSelectAnimales();
    limpiarFormularioProducto();
    // Establecer fecha mínima de hoy en los inputs de fecha
    const hoyStr = new Date().toISOString().split('T')[0];
    document.getElementById('prod-vencimiento')?.setAttribute('min', hoyStr);
    document.getElementById('prod-vencimiento-ali')?.setAttribute('min', hoyStr);
    modalProducto.show();
}

async function cargarSelectCategorias() {
    const res  = await fetch('/api/categorias');
    const data = await res.json();
    const sel  = document.getElementById('prod-categoria');
    sel.innerHTML = '<option value="">-- Seleccionar --</option>' +
        data.filter(c => c.estado === 'ACTIVO')
            .map(c => `<option value="${c.id_categoria}">${c.nombre}</option>`).join('');
}

async function cargarSelectAnimales() {
    const res  = await fetch('/api/animales');
    const data = await res.json();
    const sel  = document.getElementById('prod-animal');
    sel.innerHTML = '<option value="">-- Seleccionar --</option>' +
        data.filter(a => a.estado === 'ACTIVO')
            .map(a => `<option value="${a.id_tipo_animal}">${a.nombre}</option>`).join('');
}

function switchTab(tab, link) {
    document.getElementById('tab-archivo').classList.toggle('d-none', tab !== 'archivo');
    document.getElementById('tab-url').classList.toggle('d-none',     tab !== 'url');
    document.querySelectorAll('#tabsImagen .nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
}

async function previsualizarImagen(input) {
    const file = input.files[0];
    if (!file) return;

    // Preview local inmediato mientras sube
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('preview-img').src = e.target.result;
        document.getElementById('preview-container').classList.remove('d-none');
    };
    reader.readAsDataURL(file);

    // Limpiar URL previa y subir a R2 en segundo plano
    document.getElementById('prod-imagen-final').value = '';
    try {
        const formData = new FormData();
        formData.append('imagen', file);
        const upRes = await fetch('/api/upload/imagen-producto', { method: 'POST', body: formData });
        if (!upRes.ok) { console.error('Upload error', upRes.status); return; }
        const upData = await upRes.json();
        if (upData.url) {
            document.getElementById('prod-imagen-final').value = upData.url;
            // Actualizar preview con la URL pública de R2 (confirma que es accesible)
            document.getElementById('preview-img').src = upData.url;
        }
    } catch (err) {
        console.error('Error al subir imagen a R2:', err);
    }
}

async function editarProducto(id) {
    const p = productosLista.find(x => x.id_producto === id);
    if (!p) return;

    await cargarSelectCategorias();
    await cargarSelectAnimales();

    document.getElementById('modal-titulo').innerText       = 'Editar Producto';
    document.getElementById('prod-id').value                = p.id_producto;
    document.getElementById('prod-nombre').value            = p.nombre;
    document.getElementById('prod-descripcion').value       = p.descripcion || '';
    document.getElementById('prod-precio').value            = p.precio_venta;
    document.getElementById('prod-stock').value             = p.stock_actual;
    document.getElementById('prod-categoria').value         = p.id_categoria;
    document.getElementById('prod-animal').value            = p.id_tipo_animal;
    document.getElementById('prod-imagen-url').value        = p.imagen || '';
    document.getElementById('prod-imagen-final').value      = p.imagen || '';
    if (p.imagen) {
        const src = p.imagen.startsWith('http') ? p.imagen : `/img/productos/${p.imagen}`;
        document.getElementById('preview-img').src = src;
        document.getElementById('preview-container').classList.remove('d-none');
    } else {
        document.getElementById('preview-container').classList.add('d-none');
    }

    // Mostrar campos dinámicos según categoría
    actualizarCamposCategoria();

    // ✅ FIX: cargar valores de campos de medicamento
    const elMarca      = document.getElementById('prod-marca-med');
    const elPresent    = document.getElementById('prod-presentacion');
    const elVenc       = document.getElementById('prod-vencimiento');
    const elComp       = document.getElementById('prod-composicion');
    const elModoUso    = document.getElementById('prod-modo-uso');
    const elFicha      = document.getElementById('prod-ficha-tecnica');
    if (elMarca)   elMarca.value   = p.marca        || '';
    if (elPresent) elPresent.value = p.presentacion || '';
    if (elVenc && p.fecha_vencimiento) {
        elVenc.value = new Date(p.fecha_vencimiento).toISOString().split('T')[0];
    }
    if (elComp)    elComp.value    = p.composicion   || '';
    if (elModoUso) elModoUso.value = p.modo_uso      || '';
    if (elFicha)   elFicha.value   = p.ficha_tecnica || '';

    // ✅ FIX: cargar valores de campos de accesorio
    const elMarcaAcc = document.getElementById('prod-marca-acc');
    const elFichaAcc = document.getElementById('prod-ficha-acc');
    if (elMarcaAcc) elMarcaAcc.value = p.marca        || '';
    if (elFichaAcc) elFichaAcc.value = p.ficha_tecnica || '';

    // ✅ FIX: cargar valores de campos de alimento
    const elMarcaAli = document.getElementById('prod-marca-ali');
    const elPesoAli  = document.getElementById('prod-peso-ali');
    const elVencAli  = document.getElementById('prod-vencimiento-ali');
    const elCompAli  = document.getElementById('prod-composicion-ali');
    const elFichaAli = document.getElementById('prod-ficha-ali');
    if (elMarcaAli) elMarcaAli.value = p.marca        || '';
    if (elPesoAli)  elPesoAli.value  = p.presentacion || '';
    if (elVencAli && p.fecha_vencimiento) {
        elVencAli.value = new Date(p.fecha_vencimiento).toISOString().split('T')[0];
    }
    if (elCompAli)  elCompAli.value  = p.composicion   || '';
    if (elFichaAli) elFichaAli.value = p.ficha_tecnica || '';

    // ✅ Cargar tags de colores y tallas
    if (p.colores) cargarTags('color', p.colores);
    if (p.tallas)  cargarTags('talla', p.tallas);

    // Mostrar preview de ficha técnica si ya tiene URL
const fichaUrl = p.ficha_tecnica || '';
const fichaPreview = document.getElementById('ficha-preview');
const fichaLink    = document.getElementById('ficha-link');
if (fichaUrl && fichaPreview && fichaLink) {
    fichaLink.href = convertirUrlDrive(fichaUrl);
    fichaPreview.classList.remove('d-none');
} else if (fichaPreview) {
    fichaPreview.classList.add('d-none');
}

// Establecer fecha mínima de hoy en los inputs de fecha
const hoyStr = new Date().toISOString().split('T')[0];
const venc    = document.getElementById('prod-vencimiento');
const vencAli = document.getElementById('prod-vencimiento-ali');
if (venc)    venc.setAttribute('min', hoyStr);
if (vencAli) vencAli.setAttribute('min', hoyStr);

    modalProducto.show();
}

async function guardarProducto() {
    const id  = document.getElementById('prod-id').value;
    const sel = document.getElementById('prod-categoria');
    const txt = (sel.options[sel.selectedIndex]?.text || '').toLowerCase();

    const esMed = txt.includes('medic') || txt.includes('farmac');
    const esAcc = txt.includes('acces') || txt.includes('collar') || txt.includes('juguete');
    const esAli = txt.includes('aliment') || txt.includes('comida') || txt.includes('nutrici');

    // Imagen: usar la URL ya subida en previsualizarImagen, la URL manual, o re-subir si hizo falta
    const fileInput   = document.getElementById('prod-imagen-file');
    const urlManual   = document.getElementById('prod-imagen-url').value.trim();
    const urlSubida   = document.getElementById('prod-imagen-final').value.trim();
    let imagenFinal   = urlSubida || urlManual;

    // Si hay archivo seleccionado pero la subida previa no completó aún, subir ahora
    if (fileInput.files.length > 0 && !urlSubida) {
        const formData = new FormData();
        formData.append('imagen', fileInput.files[0]);
        const upRes  = await fetch('/api/upload/imagen-producto', { method: 'POST', body: formData });
        if (!upRes.ok) {
            const upErr = await upRes.json().catch(() => ({}));
            alert('Error al subir imagen: ' + (upErr.mensaje || upRes.status));
            return;
        }
        const upData = await upRes.json();
        if (upData.url) {
            imagenFinal = upData.url;
        } else {
            alert('El servidor no devolvió URL de imagen. Revisa la configuración de R2.');
            return;
        }
    }

    const data = {
        nombre:            document.getElementById('prod-nombre').value,
        descripcion:       document.getElementById('prod-descripcion').value,
        precio_venta:      document.getElementById('prod-precio').value,
        stock_actual:      document.getElementById('prod-stock').value,
        id_categoria:      document.getElementById('prod-categoria').value,
        id_tipo_animal:    document.getElementById('prod-animal').value,
        imagen:            imagenFinal,
        stock_minimo:      5,

        // ✅ FIX: cada categoría lee su propio campo de marca
        marca: esMed ? document.getElementById('prod-marca-med')?.value || null
             : esAcc ? document.getElementById('prod-marca-acc')?.value || null
             : esAli ? document.getElementById('prod-marca-ali')?.value || null
             : null,

        peso_presentacion: esMed ? document.getElementById('prod-presentacion')?.value  || null
                         : esAli ? document.getElementById('prod-peso-ali')?.value       || null
                         : null,

        fecha_vencimiento: esMed ? document.getElementById('prod-vencimiento')?.value   || null
                         : esAli ? document.getElementById('prod-vencimiento-ali')?.value || null
                         : null,

        composicion: esMed ? document.getElementById('prod-composicion')?.value         || null
                   : esAli ? document.getElementById('prod-composicion-ali')?.value     || null
                   : null,

        modo_uso: esMed ? document.getElementById('prod-modo-uso')?.value || null : null,

        ficha_tecnica: esMed ? document.getElementById('prod-ficha-tecnica')?.value     || null
                     : esAcc ? document.getElementById('prod-ficha-acc')?.value         || null
                     : esAli ? document.getElementById('prod-ficha-ali')?.value         || null
                     : null,

        // ✅ FIX: colores y tallas siempre desde sus inputs (solo se envían si es accesorio)
        colores: esAcc ? document.getElementById('prod-colores')?.value || null : null,
        tallas:  esAcc ? document.getElementById('prod-tallas')?.value  || null : null,
    };

    // Validar fecha de vencimiento — no permitir fechas pasadas
const fechaVenc = esMed ? document.getElementById('prod-vencimiento')?.value
                : esAli ? document.getElementById('prod-vencimiento-ali')?.value
                : null;
if (fechaVenc) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaIngresada = new Date(fechaVenc);
    if (fechaIngresada < hoy) {
        alert('⚠️ La fecha de vencimiento no puede ser una fecha pasada.');
        return;
    }
}

    const url    = id ? `/api/productos/${id}` : '/api/productos';
    const method = id ? 'PUT' : 'POST';

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            modalProducto.hide();
            document.body.classList.remove('modal-open');
            document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
            limpiarFormularioProducto();
            paginaProductos = 1;   // Volver a la primera página para ver el producto recién guardado
            cargarProductos();
            cargarEstadisticas();
            cargarGraficoStock();
        } else {
            const e = await res.json();
            alert(e.mensaje || 'Error al guardar producto');
        }
    } catch (err) {
        alert('Error al guardar producto: ' + err.message);
    }
} 
 
// Buscar ficha técnica en internet (Wikipedia)
async function buscarFicha() {
    const nombre = document.getElementById('prod-buscar-ficha').value.trim();
    if (!nombre) return alert('Escribe el nombre del medicamento');

    try {
        const res  = await fetch(`/api/productos/buscar-ficha?nombre=${encodeURIComponent(nombre)}`);
        const data = await res.json();

        if (data.encontrado && data.resumen) {
            document.getElementById('prod-ficha-tecnica').value = data.resumen;
            document.getElementById('ficha-fuente').innerHTML =
                `Fuente: <a href="${data.url}" target="_blank">Wikipedia</a> — puedes editar el texto`;
        } else {
            alert('No se encontró información automática. Puedes escribirla manualmente.');
        }
    } catch (err) {
        alert('Error al buscar. Escribe la ficha manualmente.');
    }
}


// Agregar listener al selector de categoría
document.getElementById('prod-categoria')?.addEventListener('change', actualizarCamposCategoria);

// Cambiar estado lógico del producto (activar/desactivar)
async function cambiarEstadoProducto(id, nuevoEstado) {
    const accion = nuevoEstado === 'ACTIVO' ? 'activar' : 'desactivar';
    if (!confirm(`¿Seguro que deseas ${accion} este producto?`)) return;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/productos/${id}/estado`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body:    JSON.stringify({ estado: nuevoEstado })
        });
        if (res.ok) {
            cargarProductos();
            cargarEstadisticas();
            cargarGraficoStock();
        } else {
            const e = await res.json();
            alert(e.mensaje || 'Error al cambiar el estado');
        }
    } catch (err) { alert('Error al cambiar el estado'); }
}

// Borrado físico permanente (irreversible). El backend lo bloquea si tiene pedidos.
async function eliminarProducto(id) {
    if (!confirm('⚠️ ¿Eliminar PERMANENTEMENTE este producto?\nEsta acción no se puede deshacer y borra también su imagen.')) return;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/productos/${id}`, { method:'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
        if (res.ok) {
            cargarProductos();
            cargarEstadisticas();
            cargarGraficoStock();
        } else {
            const e = await res.json();
            alert(e.mensaje || 'No se pudo eliminar el producto');
        }
    } catch (err) { alert('Error al eliminar'); }
}

// ═══════════════════════════════════════════════════
//  CLIENTES
// ═══════════════════════════════════════════════════
async function cargarClientes() {
    try {
        const token = localStorage.getItem('token');
        const res   = await fetch('/api/clientes', { headers:{'Authorization':'Bearer '+token} });
        const clientes = await res.json();
        const tbody = document.getElementById('tabla-clientes');
        if (!clientes.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay clientes</td></tr>';
            return;
        }
        tbody.innerHTML = clientes.map((c, i) => `
            <tr>
                <td>${i+1}</td>
                <td><strong>${c.nombres}</strong></td>
                <td>${c.correo}</td>
                <td>${c.telefono || '-'}</td>
                <td>${c.numero_documento || '-'}</td>
                <td>${new Date(c.fecha_registro).toLocaleDateString('es-PE')}</td>
            </tr>`).join('');
    } catch (err) { console.error('Error clientes:', err); }
}

// ═══════════════════════════════════════════════════
//  CATEGORÍAS
// ═══════════════════════════════════════════════════
async function cargarCategorias() {
    try {
        const res = await fetch('/api/categorias');
        categoriasLista = await res.json();
        const tbody = document.getElementById('tabla-categorias');
        if (!categoriasLista.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay categorías</td></tr>';
            return;
        }
        tbody.innerHTML = categoriasLista.map(c => `
            <tr>
                <td>${c.id_categoria}</td>
                <td><strong>${c.nombre}</strong></td>
                <td>${c.descripcion || '-'}</td>
                <td><span class="badge bg-${c.estado==='ACTIVO'?'success':'secondary'}">${c.estado}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editarCategoria(${c.id_categoria})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarCategoria(${c.id_categoria})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>`).join('');
    } catch (err) { console.error('Error categorías:', err); }
}

function mostrarModalCategoria() {
    document.getElementById('modal-cat-titulo').innerText = 'Nueva Categoría';
    document.getElementById('cat-id').value               = '';
    document.getElementById('cat-nombre').value           = '';
    document.getElementById('cat-descripcion').value      = '';
    document.getElementById('cat-estado').value           = 'ACTIVO';
    // Ocultar campo estado en creación
    document.getElementById('campo-cat-estado').classList.add('d-none');
    modalCategoria.show();
}

function editarCategoria(id) {
    const c = categoriasLista.find(x => x.id_categoria === id);
    if (!c) return;
    document.getElementById('modal-cat-titulo').innerText = 'Editar Categoría';
    document.getElementById('cat-id').value               = c.id_categoria;
    document.getElementById('cat-nombre').value           = c.nombre;
    document.getElementById('cat-descripcion').value      = c.descripcion || '';
    document.getElementById('cat-estado').value           = c.estado;
    // Mostrar campo estado al editar
    document.getElementById('campo-cat-estado').classList.remove('d-none');
    modalCategoria.show();
}

async function guardarCategoria() {
    const id  = document.getElementById('cat-id').value;
    const data = {
        nombre:      document.getElementById('cat-nombre').value,
        descripcion: document.getElementById('cat-descripcion').value,
        estado:      id ? document.getElementById('cat-estado').value : 'ACTIVO'
    };
    const url    = id ? `/api/categorias/${id}` : '/api/categorias';
    const method = id ? 'PUT' : 'POST';
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(url, { method, headers:{'Content-Type':'application/json', 'Authorization': 'Bearer ' + token}, body: JSON.stringify(data) });
        if (res.ok) { modalCategoria.hide(); cargarCategorias(); }
        else { const e = await res.json(); alert(e.mensaje || 'Error al guardar'); }
    } catch (err) { alert('Error al guardar categoría'); }
}

async function eliminarCategoria(id) {
    if (!confirm('¿Seguro que deseas eliminar esta categoría?')) return;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/categorias/${id}`, { method:'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
        if (res.ok) cargarCategorias();
        else { const e = await res.json(); alert(e.mensaje || 'No se puede eliminar'); }
    } catch (err) { alert('Error al eliminar'); }
}

// ── Mostrar campos según categoría ─────────────────────────────
function actualizarCamposCategoria() {
    const sel   = document.getElementById('prod-categoria');
    const texto = (sel.options[sel.selectedIndex]?.text || '').toLowerCase();

    const esMed = texto.includes('medic') || texto.includes('farmac');
    const esAcc = texto.includes('acces') || texto.includes('collar') || texto.includes('juguete');
    const esAli = texto.includes('aliment') || texto.includes('comida') || texto.includes('nutrici');

    document.getElementById('campos-medicamento').style.display = esMed ? 'block' : 'none';
    document.getElementById('campos-accesorio').style.display   = esAcc ? 'block' : 'none';
    document.getElementById('campos-alimento').style.display    = esAli ? 'block' : 'none';
}

// ── Sistema de tags para colores y tallas ──────────────────────
function agregarTag(tipo) {
    const inputId  = tipo === 'color' ? 'color-nuevo'  : 'talla-nueva';
    const tagsId   = tipo === 'color' ? 'colores-tags'  : 'tallas-tags';
    const hiddenId = tipo === 'color' ? 'prod-colores'  : 'prod-tallas';
    const color    = tipo === 'color' ? '#e8f5e9' : '#e3f2fd';
    const textColor = tipo === 'color' ? '#2e7d32' : '#1565c0';

    const input = document.getElementById(inputId);
    const valor = input.value.trim();
    if (!valor) return;

    const tag = document.createElement('span');
    tag.style.cssText = `background:${color};color:${textColor};border-radius:20px;
        padding:2px 10px;font-size:12px;cursor:pointer;display:inline-flex;
        align-items:center;gap:4px;border:1px solid ${textColor}40`;
    tag.innerHTML = `${valor} <i class="bi bi-x" onclick="eliminarTag(this, '${hiddenId}')"></i>`;
    tag.dataset.valor = valor;

    document.getElementById(tagsId).appendChild(tag);
    input.value = '';
    sincronizarHidden(hiddenId, tagsId);
}

function eliminarTag(btn, hiddenId) {
    const tagsId = hiddenId === 'prod-colores' ? 'colores-tags' : 'tallas-tags';
    btn.parentElement.remove();
    sincronizarHidden(hiddenId, tagsId);
}

function sincronizarHidden(hiddenId, tagsId) {
    const tags   = document.querySelectorAll(`#${tagsId} span`);
    const valores = Array.from(tags).map(t => t.dataset.valor).join(',');
    document.getElementById(hiddenId).value = valores;
}

function limpiarTags() {
    ['colores-tags','tallas-tags'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
    const hc = document.getElementById('prod-colores');
    const ht = document.getElementById('prod-tallas');
    if (hc) hc.value = '';
    if (ht) ht.value = '';
}

function cargarTags(tipo, valores) {
    if (!valores) return;
    valores.split(',').forEach(v => {
        const inputId = tipo === 'color' ? 'color-nuevo' : 'talla-nueva';
        document.getElementById(inputId).value = v.trim();
        agregarTag(tipo);
    });
}

// ── Buscar ficha técnica en Wikipedia ─────────────────────────
function verFichaTecnica() {
    const url = document.getElementById('prod-ficha-tecnica').value.trim();
    if (!url) return alert('Primero pega el enlace de Google Drive');

    // Convertir enlace de Drive a enlace de vista previa si es necesario
    const urlFinal = convertirUrlDrive(url);

    const preview = document.getElementById('ficha-preview');
    const link    = document.getElementById('ficha-link');
    link.href     = urlFinal;
    preview.classList.remove('d-none');
    window.open(urlFinal, '_blank');
}

function convertirUrlDrive(url) {
    // Si es enlace de compartir Drive, convertir a enlace directo de vista
    // https://drive.google.com/file/d/ID/view → https://drive.google.com/file/d/ID/view
    // https://drive.google.com/open?id=ID     → https://drive.google.com/file/d/ID/view
    const matchOpen = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchOpen) {
        return `https://drive.google.com/file/d/${matchOpen[1]}/view`;
    }
    // Si ya es formato /file/d/ID/... dejarlo como está
    return url;
}

// ═══════════════════════════════════════════════════
//  ANIMALES
// ═══════════════════════════════════════════════════
async function cargarAnimales() {
    try {
        const res = await fetch('/api/animales');
        animalesLista = await res.json();
        const tbody = document.getElementById('tabla-animales');
        if (!animalesLista.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay animales</td></tr>';
            return;
        }
        tbody.innerHTML = animalesLista.map(a => `
            <tr>
                <td>${a.id_tipo_animal}</td>
                <td><strong>${a.nombre}</strong></td>
                <td><span class="badge bg-${a.estado==='ACTIVO'?'success':'secondary'}">${a.estado}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editarAnimal(${a.id_tipo_animal})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarAnimal(${a.id_tipo_animal})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>`).join('');
    } catch (err) { console.error('Error animales:', err); }
}

function mostrarModalAnimal() {
    document.getElementById('modal-ani-titulo').innerText = 'Nuevo Tipo de Animal';
    document.getElementById('ani-id').value               = '';
    document.getElementById('ani-nombre').value           = '';
    document.getElementById('ani-estado').value           = 'ACTIVO';
    // Ocultar campo estado en creación
    document.getElementById('campo-ani-estado').classList.add('d-none');
    modalAnimal.show();
}

function editarAnimal(id) {
    const a = animalesLista.find(x => x.id_tipo_animal === id);
    if (!a) return;
    document.getElementById('modal-ani-titulo').innerText = 'Editar Tipo de Animal';
    document.getElementById('ani-id').value               = a.id_tipo_animal;
    document.getElementById('ani-nombre').value           = a.nombre;
    document.getElementById('ani-estado').value           = a.estado;
    // Mostrar campo estado al editar
    document.getElementById('campo-ani-estado').classList.remove('d-none');
    modalAnimal.show();
}

async function guardarAnimal() {
    const id   = document.getElementById('ani-id').value;
    const data = {
        nombre: document.getElementById('ani-nombre').value,
        estado: id ? document.getElementById('ani-estado').value : 'ACTIVO'
    };
    const url    = id ? `/api/animales/${id}` : '/api/animales';
    const method = id ? 'PUT' : 'POST';
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            // Cerrar modal limpiamente
            modalAnimal.hide();
            // Limpiar residuos del modal que bloquean la UI
            document.body.classList.remove('modal-open');
            document.body.style.removeProperty('padding-right');
            document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
            // Recargar lista
            await cargarAnimales();
        } else {
            const e = await res.json();
            alert(e.mensaje || 'Error al guardar');
        }
    } catch (err) {
        alert('Error al guardar animal');
    }
}

async function eliminarAnimal(id) {
    if (!confirm('¿Seguro que deseas eliminar este animal?')) return;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/animales/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
        if (res.ok) {
            document.body.classList.remove('modal-open');
            document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
            await cargarAnimales();
        } else {
            const e = await res.json();
            alert(e.mensaje || 'No se puede eliminar');
        }
    } catch (err) {
        alert('Error al eliminar');
    }
}
// ═══════════════════════════════════════════════════
//  COLABORADORES
// ═══════════════════════════════════════════════════
async function cargarColaboradores() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/colaboradores', { headers: { 'Authorization': 'Bearer ' + token } });
        colaboradoresLista = await res.json();
        const tbody = document.getElementById('tabla-colaboradores');
        if (!colaboradoresLista.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay colaboradores</td></tr>';
            return;
        }
        tbody.innerHTML = colaboradoresLista.map(c => `
            <tr>
                <td>${c.id_colaborador}</td>
                <td><strong>${c.nombres} ${c.apellido_paterno || ''}</strong></td>
                <td>${c.usuario}</td>
                <td>${c.dni || '-'}</td>
                <td>${c.cargo || '-'}</td>
                <td>${c.correo}</td>
                <td><span class="badge bg-${c.estado==='ACTIVO'?'success':'secondary'}">${c.estado}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="editarColaborador(${c.id_colaborador})">
                        <i class="bi bi-pencil"></i>
                    </button>
                </td>
            </tr>`).join('');
    } catch (err) { console.error('Error colaboradores:', err); }
}

async function mostrarModalColaborador() {
    document.getElementById('modal-col-titulo').innerText = 'Nuevo Colaborador';
    document.getElementById('col-id').value        = '';
    document.getElementById('col-nombres').value   = '';
    document.getElementById('col-apellido-p').value= '';
    document.getElementById('col-apellido-m').value= '';
    document.getElementById('col-dni').value       = '';
    document.getElementById('col-telefono').value  = '';
    document.getElementById('col-correo').value    = '';
    document.getElementById('col-usuario').value   = '';
    document.getElementById('col-password').value  = '';
    document.getElementById('col-password2').value = '';
    document.getElementById('campo-col-password').classList.remove('d-none');
    document.getElementById('campo-col-reset').classList.add('d-none');
    document.getElementById('campo-col-estado-wrap').style.display = 'none';
    await cargarSelectCargos();
    modalColaborador.show();
}

function editarColaborador(id) {
    const c = colaboradoresLista.find(x => x.id_colaborador === id);
    if (!c) return;
    document.getElementById('modal-col-titulo').innerText = 'Editar Colaborador';
    document.getElementById('col-id').value        = c.id_colaborador;
    document.getElementById('col-nombres').value   = c.nombres;
    document.getElementById('col-apellido-p').value= c.apellido_paterno || '';
    document.getElementById('col-apellido-m').value= c.apellido_materno || '';
    document.getElementById('col-dni').value       = c.dni || '';
    document.getElementById('col-telefono').value  = c.telefono || '';
    document.getElementById('col-correo').value    = c.correo;
    document.getElementById('col-usuario').value   = c.usuario;
    document.getElementById('campo-col-password').classList.add('d-none');
    document.getElementById('campo-col-reset').classList.remove('d-none');
    document.getElementById('reset-pass-form').classList.add('d-none');
    document.getElementById('campo-col-estado-wrap').style.display = 'block';
    document.getElementById('col-estado').value    = c.estado;
    cargarSelectCargos().then(() => {
        document.getElementById('col-cargo').value = c.id_cargo;
    });
    modalColaborador.show();
}

async function cargarSelectCargos() {
    const token = localStorage.getItem('token');
    const res  = await fetch('/api/colaboradores/cargos', { headers: { 'Authorization': 'Bearer ' + token } });
    const data = await res.json();
    document.getElementById('col-cargo').innerHTML =
        '<option value="">-- Seleccionar --</option>' +
        data.map(c => `<option value="${c.id_cargo}">${c.nombre}</option>`).join('');
}

function mostrarResetPassword() {
    document.getElementById('reset-pass-form').classList.toggle('d-none');
}

async function guardarColaborador() {
    const id = document.getElementById('col-id').value;

    if (!id) {
        // CREAR
        const pass  = document.getElementById('col-password').value;
        const pass2 = document.getElementById('col-password2').value;
        if (!pass) { alert('Ingresa una contraseña'); return; }
        if (pass !== pass2) { alert('Las contraseñas no coinciden'); return; }

        const data = {
            nombres:         document.getElementById('col-nombres').value,
            apellido_paterno:document.getElementById('col-apellido-p').value,
            apellido_materno:document.getElementById('col-apellido-m').value,
            dni:             document.getElementById('col-dni').value,
            telefono:        document.getElementById('col-telefono').value,
            correo:          document.getElementById('col-correo').value,
            usuario:         document.getElementById('col-usuario').value,
            id_cargo:        document.getElementById('col-cargo').value,
            password:        pass
        };
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/colaboradores', {
                method:'POST', headers:{'Content-Type':'application/json', 'Authorization': 'Bearer ' + token}, body: JSON.stringify(data)
            });
            if (res.ok) { modalColaborador.hide(); cargarColaboradores(); alert('Colaborador creado correctamente'); }
            else { const e = await res.json(); alert(e.mensaje || 'Error al crear'); }
        } catch (err) { alert('Error al crear colaborador'); }

    } else {
        // EDITAR
        const data = {
            nombres:         document.getElementById('col-nombres').value,
            apellido_paterno:document.getElementById('col-apellido-p').value,
            apellido_materno:document.getElementById('col-apellido-m').value,
            telefono:        document.getElementById('col-telefono').value,
            usuario:         document.getElementById('col-usuario').value,
            id_cargo:        document.getElementById('col-cargo').value,
            estado:          document.getElementById('col-estado').value
        };
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/colaboradores/${id}`, {
                method:'PUT', headers:{'Content-Type':'application/json', 'Authorization': 'Bearer ' + token}, body: JSON.stringify(data)
            });
            if (res.ok) {
                // Verificar si quiso cambiar contraseña
                const newPass  = document.getElementById('col-nueva-password').value;
                const newPass2 = document.getElementById('col-nueva-password2').value;
                if (newPass) {
                    if (newPass !== newPass2) { alert('Las nuevas contraseñas no coinciden'); return; }
                    await fetch(`/api/colaboradores/${id}/reset-password`, {
                        method:'PUT', headers:{'Content-Type':'application/json', 'Authorization': 'Bearer ' + token},
                        body: JSON.stringify({ nuevaPassword: newPass })
                    });
                }
                modalColaborador.hide();
                cargarColaboradores();
                alert('Colaborador actualizado correctamente');
            } else { const e = await res.json(); alert(e.mensaje || 'Error al actualizar'); }
        } catch (err) { alert('Error al actualizar colaborador'); }
    }
}

// ═══════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
    verificarAcceso();
    modalProducto    = new bootstrap.Modal(document.getElementById('modalProducto'));
    modalCategoria   = new bootstrap.Modal(document.getElementById('modalCategoria'));
    modalAnimal      = new bootstrap.Modal(document.getElementById('modalAnimal'));
    modalColaborador = new bootstrap.Modal(document.getElementById('modalColaborador'));

    cargarEstadisticas();
    cargarPedidosRecientes();
    cargarGraficoVentas();
    cargarGraficoProductos();
    cargarGraficoStock();

    // Polling de nuevos pedidos cada 30 segundos
    intervaloPedidos = setInterval(verificarNuevosPedidos, 30000);

    // Si llega ?seccion=, abrir esa sección del panel (navegación desde Reportes/Ventas)
    const seccionURL = new URLSearchParams(location.search).get('seccion');
    if (seccionURL) {
        const link = document.querySelector(`.sidebar .nav-link[onclick*="'${seccionURL}'"]`);
        mostrarSeccion(seccionURL, link);
    }
});