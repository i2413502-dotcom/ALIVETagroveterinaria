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
let modalProducto, modalCategoria, modalAnimal, modalColaborador, modalOtpColaborador, modalSubcategorias;
let productosLista = [], categoriasLista = [], animalesLista = [], colaboradoresLista = [];
let chartProductos = null, chartStock = null, chartTopClientes = null;

// NOTA: confirmarAccion() y mostrarAlerta() (reemplazos de confirm()/alert()
// nativos) viven en /js/ui-mensajes.js, compartido con ventas.html y
// reportes.html — ver ese archivo para su implementación.

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
    const secciones = ['inicio','productos','clientes','categorias','animales','colaboradores'];
    secciones.forEach(s => document.getElementById('seccion-'+s).classList.add('d-none'));
    document.getElementById('seccion-'+seccion).classList.remove('d-none');

    const titulos = {
        inicio:'Dashboard',
        productos:'Inventario de Productos', clientes:'Clientes Registrados',
        categorias:'Categorías de Producto', animales:'Tipos de Animal',
        colaboradores:'Colaboradores'
    };
    document.getElementById('titulo-seccion').innerText = titulos[seccion];
    document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
    if (link) link.classList.add('active');

    if (seccion === 'productos')     cargarProductos();
    if (seccion === 'clientes')      cargarClientes();
    if (seccion === 'categorias')    cargarCategorias();
    if (seccion === 'animales')      cargarAnimales();
    if (seccion === 'colaboradores') cargarColaboradores();
}

function cerrarSesion() {
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
        mostrarAlerta('Error al exportar: ' + err.message);
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
        document.getElementById('stat-productos').innerText  = data.productos;
        document.getElementById('stat-ventas').innerText     = 'S/. ' + parseFloat(data.ventasTotal || 0).toFixed(2);
    } catch (err) { console.error('Error estadísticas:', err); }
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
//  GRÁFICO — TOP 10 CLIENTES QUE MÁS COMPRAN
//  Mismo endpoint que usa Promociones para las mismas listas
//  (GET /api/dashboard/top-clientes), solo que aquí se grafica
//  en vez de mostrarse como checkboxes.
// ═══════════════════════════════════════════════════
async function cargarGraficoTopClientes() {
    try {
        const token = localStorage.getItem('token');
        const res  = await fetch('/api/dashboard/top-clientes?limite=10', { headers: { 'Authorization': 'Bearer ' + token } });
        const data = await res.json();
        const ctx  = document.getElementById('chartTopClientes').getContext('2d');
        if (chartTopClientes) chartTopClientes.destroy();

        if (!data.length) {
            // Sin clientes con compras confirmadas todavía — se deja el
            // canvas vacío en vez de un gráfico sin datos que confunda.
            return;
        }

        // Colores — mismo criterio que "Productos Más Vendidos", con
        // más tonos para llegar a 10 clientes sin repetir color.
        const colores = [
            '#06A049', '#28a745', '#17a2b8', '#ffc107', '#fd7e14',
            '#20c997', '#6f42c1', '#0dcaf0', '#e83e8c', '#adb5bd'
        ];

        chartTopClientes = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(d => d.nombres || d.correo || 'Cliente'),
                datasets: [{
                    // Tamaño de cada porción = CANTIDAD de pedidos, no
                    // dinero — así un pedido de prueba con un monto
                    // absurdo (ej. S/. 1,069,160 cancelado) no revienta
                    // el gráfico: cuenta como 1 pedido, igual que
                    // cualquier otro.
                    data:            data.map(d => d.total_pedidos),
                    backgroundColor: colores,
                    borderWidth:     2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12 } },
                    tooltip: {
                        callbacks: {
                            label:      (ctx) => `${ctx.label}: ${ctx.raw} pedido(s)`,
                            // El monto gastado se muestra aparte, como
                            // dato extra, no como tamaño de la porción.
                            afterLabel: (ctx) => `S/. ${Number(data[ctx.dataIndex].total_gastado).toFixed(2)}`
                        }
                    }
                }
            }
        });
    } catch (err) { console.error('Error gráfico top clientes:', err); }
}
// ═══════════════════════════════════════════════════
//  PRODUCTOS
// ═══════════════════════════════════════════════════
// 'activos' (todo menos lo archivado) o 'archivados' — mismo patrón
// que vistaActual en Ventas.
let vistaProductosActual = 'activos';

function cambiarVistaProductos(vista) {
    vistaProductosActual = vista;
    document.querySelectorAll('#tabs-vista-productos [data-vista-producto]').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.vistaProducto === vista));
    paginaProductos = 1;
    cargarProductos();
}

async function cargarProductos() {
    try {
        // incluirInactivos=1 → el panel admin ve también los desactivados (el catálogo público no)
        // Paginación del lado del servidor (igual que el catálogo público)
        const res  = await fetch(`/api/productos?incluirInactivos=1&vista=${vistaProductosActual}&pagina=${paginaProductos}&limite=${LIMITE_PRODUCTOS}`);
        const data = await res.json();
        productosLista = data.productos || [];
        const tbody = document.getElementById('tabla-productos');
        if (!productosLista.length) {
            const msg = vistaProductosActual === 'archivados' ? 'No hay productos archivados' : 'No hay productos';
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">${msg}</td></tr>`;
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
            const archivado = p.estado === 'ARCHIVADO';

            // Enlace a ficha técnica (fuera del botón de editar)
            const fichaBtn = p.ficha_tecnica ? `
                    <a href="${convertirUrlDrive(p.ficha_tecnica)}" target="_blank"
                       class="btn btn-sm btn-outline-secondary me-1" title="Ver Ficha Técnica">
                        <i class="bi bi-file-earmark-pdf"></i>
                    </a>` : '';

            // Un producto archivado solo se puede "Restaurar" (vuelve a
            // ACTIVO) — no tiene sentido ofrecer Desactivar/Eliminar de
            // nuevo sobre algo que ya está fuera de circulación.
            const toggleBtn = archivado
                ? `<button class="btn btn-sm btn-outline-success me-1" title="Restaurar producto"
                           data-accion="cambiar-estado-producto" data-id="${p.id_producto}" data-estado="ACTIVO">
                        <i class="bi bi-arrow-counterclockwise"></i>
                   </button>`
                : inactivo
                ? `<button class="btn btn-sm btn-outline-success me-1" title="Activar producto"
                           data-accion="cambiar-estado-producto" data-id="${p.id_producto}" data-estado="ACTIVO">
                        <i class="bi bi-toggle-off"></i>
                   </button>`
                : `<button class="btn btn-sm btn-outline-warning me-1" title="Desactivar producto"
                           data-accion="cambiar-estado-producto" data-id="${p.id_producto}" data-estado="INACTIVO">
                        <i class="bi bi-toggle-on"></i>
                   </button>`;

            return `
            <tr class="${inactivo || archivado ? 'opacity-50' : ''}">
                <td>${p.id_producto}</td>
                <td><img src="${imgSrc}" alt="img" style="width:45px;height:45px;object-fit:cover;border-radius:8px;"
                         onerror="this.onerror=null;this.src='/img/logo.jpeg';"></td>
                <td><strong>${p.nombre}</strong>${archivado ? ' <span class="badge bg-dark ms-1">Archivado</span>' : inactivo ? ' <span class="badge bg-secondary ms-1">Inactivo</span>' : ''}</td>
                <td>${p.categoria || '-'}</td>
                <td>${p.tipo_animal || '-'}</td>
                <td class="text-success fw-bold">S/. ${parseFloat(p.precio_venta).toFixed(2)}</td>
                <td>${p.stock_actual}</td>
                <td>${stockEstado}</td>
                <td class="text-nowrap">
                    ${fichaBtn}
                    <button class="btn btn-sm btn-outline-primary me-1" title="Editar producto" data-accion="editar-producto" data-id="${p.id_producto}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    ${toggleBtn}
                    ${archivado ? '' : `
                    <button class="btn btn-sm btn-outline-danger" title="Eliminar permanentemente" data-accion="eliminar-producto" data-id="${p.id_producto}">
                        <i class="bi bi-trash"></i>
                    </button>`}
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
    html += `<button class="btn btn-sm btn-outline-success" ${actual === 1 ? 'disabled' : ''} data-accion="pagina-productos" data-pagina="${actual - 1}">← Anterior</button>`;
    const ini = Math.max(1, actual - 2);
    const fin = Math.min(totalPaginas, ini + 4);
    for (let i = ini; i <= fin; i++) {
        html += `<button class="btn btn-sm ${i === actual ? 'btn-success' : 'btn-outline-success'}" data-accion="pagina-productos" data-pagina="${i}">${i}</button>`;
    }
    html += `<button class="btn btn-sm btn-outline-success" ${actual === totalPaginas ? 'disabled' : ''} data-accion="pagina-productos" data-pagina="${actual + 1}">Siguiente →</button>`;
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
        'prod-categoria','prod-subcategoria','prod-grupo-animal','prod-animal',
        'prod-codigo-barra',
        'prod-imagen-sec-1-file','prod-imagen-sec-1','prod-imagen-sec-2-file','prod-imagen-sec-2',
        // medicamento
        'prod-marca-med','prod-presentacion','prod-vencimiento','prod-composicion','prod-modo-uso','prod-ficha-tecnica',
        'prod-ficha-pdf-file','prod-ficha-tecnica-url',
        // accesorio
        'prod-marca-acc','prod-ficha-acc',
        // alimento
        'prod-marca-ali','prod-peso-ali','prod-vencimiento-ali','prod-composicion-ali','prod-ficha-ali','prod-etapa-ali'
    ];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

    document.getElementById('preview-container')?.classList.add('d-none');
    document.getElementById('preview-sec-1-container')?.classList.add('d-none');
    document.getElementById('preview-sec-2-container')?.classList.add('d-none');
    document.getElementById('ficha-preview')?.classList.add('d-none');
    const fuente = document.getElementById('ficha-fuente'); if (fuente) fuente.innerHTML = '';

    limpiarTags();

    // Volver a dejar Subcategoría y Tipo de Animal deshabilitados hasta
    // que se elija Categoría / Grupo (cascada)
    filtrarAnimalesPorGrupo('');
    cargarSubcategorias('');

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

// Trae TODOS los animales una sola vez y los guarda en memoria; el <select>
// de tipo de animal se rellena filtrando este arreglo según el grupo elegido
// (ver filtrarAnimalesPorGrupo). Así evitamos ida y vuelta al servidor cada
// vez que el usuario cambia el grupo.
let animalesCatalogo = [];
async function cargarSelectAnimales() {
    const res  = await fetch('/api/animales');
    animalesCatalogo = (await res.json()).filter(a => a.estado === 'ACTIVO');
}

// Filtra el <select> de Tipo de Animal según el Grupo (MAYOR/MENOR) elegido.
// Si aún no se eligió un grupo, deja el select deshabilitado.
function filtrarAnimalesPorGrupo(grupo, valorSeleccionado = '') {
    const sel = document.getElementById('prod-animal');
    if (!grupo) {
        sel.innerHTML = '<option value="">-- Elige primero un grupo --</option>';
        sel.disabled = true;
        return;
    }
    const opciones = animalesCatalogo.filter(a => a.grupo === grupo);
    sel.innerHTML = '<option value="">-- Seleccionar --</option>' +
        opciones.map(a => `<option value="${a.id_tipo_animal}">${a.nombre}</option>`).join('');
    sel.disabled = false;
    if (valorSeleccionado) sel.value = valorSeleccionado;
}

// Trae las subcategorías activas de la categoría elegida y rellena el
// <select> de Subcategoría. Categorías sin subcategorías registradas
// simplemente dejan el select vacío (la subcategoría es opcional).
async function cargarSubcategorias(idCategoria, valorSeleccionado = '') {
    const sel = document.getElementById('prod-subcategoria');
    if (!idCategoria) {
        sel.innerHTML = '<option value="">-- Elige primero una categoría --</option>';
        sel.disabled = true;
        return;
    }
    try {
        const res  = await fetch(`/api/categorias/${idCategoria}/subcategorias`);
        const data = await res.json();
        if (!data.length) {
            sel.innerHTML = '<option value="">-- Sin subcategorías --</option>';
            sel.disabled = true;
            return;
        }
        sel.innerHTML = '<option value="">-- Seleccionar --</option>' +
            data.map(sc => `<option value="${sc.id_subcategoria}">${sc.nombre}</option>`).join('');
        sel.disabled = false;
        if (valorSeleccionado) sel.value = valorSeleccionado;
    } catch (err) {
        console.error('Error al cargar subcategorías:', err);
        sel.innerHTML = '<option value="">-- Sin subcategorías --</option>';
        sel.disabled = true;
    }
}

function switchTab(tab, link) {
    document.getElementById('tab-archivo').classList.toggle('d-none', tab !== 'archivo');
    document.getElementById('tab-url').classList.toggle('d-none',     tab !== 'url');
    document.querySelectorAll('#tabsImagen .nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
}

function switchTabFicha(tab, link) {
    document.getElementById('tab-ficha-archivo').classList.toggle('d-none', tab !== 'archivo');
    document.getElementById('tab-ficha-url').classList.toggle('d-none',     tab !== 'url');
    document.querySelectorAll('#tabsFicha .nav-link').forEach(l => l.classList.remove('active'));
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
       // Limpiar URL previa y subir a R2 en segundo plano
    document.getElementById('prod-imagen-final').value = '';
    try {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('imagen', file);
        const upRes = await fetch('/api/upload/imagen-producto', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });
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

// Sube una imagen secundaria (slot 1 o 2) a R2, igual que la principal,
// y la deja lista en el hidden correspondiente para guardarProducto().
async function previsualizarImagenSecundaria(input, slot) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById(`preview-sec-${slot}-img`).src = e.target.result;
        document.getElementById(`preview-sec-${slot}-container`).classList.remove('d-none');
    };
    reader.readAsDataURL(file);

    document.getElementById(`prod-imagen-sec-${slot}`).value = '';
    try {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('imagen', file);
        const upRes = await fetch('/api/upload/imagen-producto', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });
        if (!upRes.ok) { console.error('Upload error', upRes.status); return; }
        const upData = await upRes.json();
        if (upData.url) {
            document.getElementById(`prod-imagen-sec-${slot}`).value = upData.url;
            document.getElementById(`preview-sec-${slot}-img`).src = upData.url;
        }
    } catch (err) {
        console.error('Error al subir imagen secundaria a R2:', err);
    }
}

// Quita la imagen secundaria elegida (solo del formulario; si el producto
// ya existía y esa imagen ya estaba guardada, sigue en la BD hasta que se
// borre desde la ficha del producto — este botón solo limpia la selección
// que se está por enviar).
function quitarImagenSecundaria(slot) {
    document.getElementById(`prod-imagen-sec-${slot}-file`).value = '';
    document.getElementById(`prod-imagen-sec-${slot}`).value      = '';
    document.getElementById(`preview-sec-${slot}-container`).classList.add('d-none');
}

// Sube el PDF de ficha técnica a R2 (mismo patrón que previsualizarImagen,
// pero llamando a /api/upload/ficha-tecnica). Al terminar, deja la URL
// pública en el mismo campo de texto que ya usaba el link de Drive, así
// el resto del formulario (guardar producto) no necesita ningún cambio.
async function subirFichaTecnicaPdf(input) {
    const file = input.files[0];
    if (!file) return;

    const spinner = document.getElementById('ficha-pdf-spinner');
    spinner.classList.remove('d-none');

    try {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('archivo', file);
        const upRes = await fetch('/api/upload/ficha-tecnica', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });
        if (!upRes.ok) {
            console.error('Upload error', upRes.status);
            mostrarAlerta('No se pudo subir el PDF. Intenta de nuevo.');
            return;
        }
        const upData = await upRes.json();
        if (upData.url) {
            document.getElementById('prod-ficha-tecnica').value = upData.url;
        }
    } catch (err) {
        console.error('Error al subir ficha técnica a R2:', err);
        mostrarAlerta('No se pudo subir el PDF. Intenta de nuevo.');
    } finally {
        spinner.classList.add('d-none');
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
    document.getElementById('prod-codigo-barra').value      = p.codigo_barra || '';

    // Cascada Grupo → Tipo de Animal: primero ubicamos a qué grupo
    // pertenece el animal ya asignado y lo pre-seleccionamos.
    const animalActual = animalesCatalogo.find(a => a.id_tipo_animal === p.id_tipo_animal);
    if (animalActual) {
        document.getElementById('prod-grupo-animal').value = animalActual.grupo;
        filtrarAnimalesPorGrupo(animalActual.grupo, p.id_tipo_animal);
    }

    // Cascada Categoría → Subcategoría
    await cargarSubcategorias(p.id_categoria, p.id_subcategoria || '');

    document.getElementById('prod-imagen-url').value        = p.imagen || '';
    document.getElementById('prod-imagen-final').value      = p.imagen || '';
    if (p.imagen) {
        const src = p.imagen.startsWith('http') ? p.imagen : `/img/productos/${p.imagen}`;
        document.getElementById('preview-img').src = src;
        document.getElementById('preview-container').classList.remove('d-none');
    } else {
        document.getElementById('preview-container').classList.add('d-none');
    }

    // Imágenes secundarias: la lista de productos (paginada) no las trae,
    // así que se piden aparte al endpoint de detalle admin.
    document.getElementById('preview-sec-1-container').classList.add('d-none');
    document.getElementById('preview-sec-2-container').classList.add('d-none');
    document.getElementById('prod-imagen-sec-1').value = '';
    document.getElementById('prod-imagen-sec-2').value = '';
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/productos/${id}/admin`, { headers: { 'Authorization': 'Bearer ' + token } });
        if (res.ok) {
            const detalle = await res.json();
            const secundarias = (detalle.imagenes || []).filter(img => !img.es_principal).slice(0, 2);
            secundarias.forEach((img, i) => {
                const slot = i + 1;
                document.getElementById(`prod-imagen-sec-${slot}`).value = img.url_imagen;
                document.getElementById(`preview-sec-${slot}-img`).src   = img.url_imagen;
                document.getElementById(`preview-sec-${slot}-container`).classList.remove('d-none');
            });
        }
    } catch (err) {
        console.error('No se pudieron cargar las imágenes secundarias:', err);
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
    const elFichaUrl    = document.getElementById('prod-ficha-tecnica-url');
    if (elFichaUrl) elFichaUrl.value = p.ficha_tecnica || '';
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
    const elEtapaAli = document.getElementById('prod-etapa-ali');
    if (elMarcaAli) elMarcaAli.value = p.marca        || '';
    if (elPesoAli)  elPesoAli.value  = p.presentacion || '';
    if (elVencAli && p.fecha_vencimiento) {
        elVencAli.value = new Date(p.fecha_vencimiento).toISOString().split('T')[0];
    }
    if (elCompAli)  elCompAli.value  = p.composicion   || '';
    if (elFichaAli) elFichaAli.value = p.ficha_tecnica || '';
    if (elEtapaAli) elEtapaAli.value = p.etapa_alimentacion || '';

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

    // Validación de la cascada Grupo → Tipo de Animal (ambos obligatorios)
    if (!document.getElementById('prod-grupo-animal').value) {
        mostrarAlerta('Selecciona el Grupo de Animal (Mayor / Menor).');
        return;
    }
    if (!document.getElementById('prod-animal').value) {
        mostrarAlerta('Selecciona el Tipo de Animal.');
        return;
    }
    // Código de barra ahora es obligatorio (antes era opcional) — se
    // usa para el escaneo desde la app móvil.
    if (!document.getElementById('prod-codigo-barra').value.trim()) {
        mostrarAlerta('Ingresa el código de barra del producto.');
        return;
    }

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
            mostrarAlerta('Error al subir imagen: ' + (upErr.mensaje || upRes.status));
            return;
        }
        const upData = await upRes.json();
        if (upData.url) {
            imagenFinal = upData.url;
        } else {
            mostrarAlerta('El servidor no devolvió URL de imagen. Revisa la configuración de R2.');
            return;
        }
    }

    // Ficha técnica: igual que la imagen — priorizar el PDF ya subido,
    // si no hay, usar la URL manual (Drive); si hay archivo elegido pero
    // aún no terminó de subir, subirlo ahora antes de guardar.
    const fichaFileInput = document.getElementById('prod-ficha-pdf-file');
    const fichaUrlManual = document.getElementById('prod-ficha-tecnica-url')?.value.trim() || '';
    const fichaUrlSubida = document.getElementById('prod-ficha-tecnica').value.trim();
    let fichaFinal = fichaUrlSubida || fichaUrlManual;

    if (fichaFileInput && fichaFileInput.files.length > 0 && !fichaUrlSubida) {
        const fichaFormData = new FormData();
        fichaFormData.append('archivo', fichaFileInput.files[0]);
        const token = localStorage.getItem('token');
        const fichaUpRes = await fetch('/api/upload/ficha-tecnica', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: fichaFormData
        });
        if (!fichaUpRes.ok) {
            const fichaUpErr = await fichaUpRes.json().catch(() => ({}));
            mostrarAlerta('Error al subir la ficha técnica: ' + (fichaUpErr.mensaje || fichaUpRes.status));
            return;
        }
        const fichaUpData = await fichaUpRes.json();
        if (fichaUpData.url) fichaFinal = fichaUpData.url;
    }

    const data = {
        nombre:            document.getElementById('prod-nombre').value,
        descripcion:       document.getElementById('prod-descripcion').value,
        precio_venta:      document.getElementById('prod-precio').value,
        stock_actual:      document.getElementById('prod-stock').value,
        id_categoria:      document.getElementById('prod-categoria').value,
        id_subcategoria:   document.getElementById('prod-subcategoria').value || null,
        id_tipo_animal:    document.getElementById('prod-animal').value,
        imagen:            imagenFinal,
        codigo_barra:      document.getElementById('prod-codigo-barra')?.value.trim() || null,
        imagenes_secundarias: [
            document.getElementById('prod-imagen-sec-1').value,
            document.getElementById('prod-imagen-sec-2').value
        ].filter(Boolean),
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

        etapa_alimentacion: esAli ? document.getElementById('prod-etapa-ali')?.value || null : null,

        ficha_tecnica: esMed ? (fichaFinal || null)
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
        mostrarAlerta('⚠️ La fecha de vencimiento no puede ser una fecha pasada.');
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
            mostrarAlerta(e.mensaje || 'Error al guardar producto');
        }
    } catch (err) {
        mostrarAlerta('Error al guardar producto: ' + err.message);
    }
} 
 
// Buscar ficha técnica en internet (Wikipedia)
async function buscarFicha() {
    const nombre = document.getElementById('prod-buscar-ficha').value.trim();
    if (!nombre) return mostrarAlerta('Escribe el nombre del medicamento');

    try {
        const res  = await fetch(`/api/productos/buscar-ficha?nombre=${encodeURIComponent(nombre)}`);
        const data = await res.json();

        if (data.encontrado && data.resumen) {
            document.getElementById('prod-ficha-tecnica').value = data.resumen;
            document.getElementById('ficha-fuente').innerHTML =
                `Fuente: <a href="${data.url}" target="_blank">Wikipedia</a> — puedes editar el texto`;
        } else {
            mostrarAlerta('No se encontró información automática. Puedes escribirla manualmente.');
        }
    } catch (err) {
        mostrarAlerta('Error al buscar. Escribe la ficha manualmente.');
    }
}


// Agregar listener al selector de categoría (campos dinámicos + subcategorías en cascada)
document.getElementById('prod-categoria')?.addEventListener('change', (e) => {
    actualizarCamposCategoria();
    cargarSubcategorias(e.target.value);
});

// Agregar listener al selector de Grupo de Animal (filtra el select de especie)
document.getElementById('prod-grupo-animal')?.addEventListener('change', (e) => {
    filtrarAnimalesPorGrupo(e.target.value);
});

// Cambiar estado lógico del producto (activar/desactivar)
async function cambiarEstadoProducto(id, nuevoEstado) {
    const accion = nuevoEstado === 'ACTIVO' ? 'activar' : 'desactivar';
    const prod = productosLista.find(x => x.id_producto === id);
    const ok = await confirmarAccion({
        tipo: 'advertencia',
        titulo: accion === 'activar' ? 'Activar producto' : 'Desactivar producto',
        mensaje: `¿Seguro que deseas ${accion} "${prod ? prod.nombre : 'este producto'}"?` +
                 (accion === 'desactivar' ? ' Dejará de verse en el catálogo hasta que lo actives de nuevo.' : ''),
        textoConfirmar: accion === 'activar' ? 'Sí, activar' : 'Sí, desactivar'
    });
    if (!ok) return;
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
            mostrarAlerta(`Producto ${accion === 'activar' ? 'activado' : 'desactivado'} correctamente`, 'exito');
        } else {
            const e = await res.json();
            mostrarAlerta(e.mensaje || 'Error al cambiar el estado', 'error');
        }
    } catch (err) { mostrarAlerta('Error al cambiar el estado', 'error'); }
}

// Borrado físico permanente (irreversible). El backend lo bloquea si el
// producto tiene pedidos que aún no fueron entregados (ver módulo 1).
async function eliminarProducto(id) {
    const prod = productosLista.find(x => x.id_producto === id);
    const ok = await confirmarAccion({
        tipo: 'peligro',
        titulo: 'Eliminar producto permanentemente',
        mensaje: `¿Eliminar "${prod ? prod.nombre : 'este producto'}" de forma PERMANENTE? Esta acción no se puede deshacer y borra también su imagen.\n\n` +
                 `Si solo quieres ocultarlo del catálogo (por ejemplo, dejó de venderse) pero conservar su historial, usa mejor el botón "Desactivar" (🔘) en vez de eliminar.`,
        textoConfirmar: 'Sí, eliminar de todas formas'
    });
    if (!ok) return;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/productos/${id}`, { method:'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
        const data = await res.json();
        if (res.ok) {
            cargarProductos();
            cargarEstadisticas();
            cargarGraficoStock();
            // Si el backend no pudo borrar de verdad (tenía pedidos
            // asociados), lo archivó en su lugar — mensaje distinto,
            // no es un error, pero tampoco un borrado literal.
            mostrarAlerta(data.mensaje || (data.archivado ? 'Producto archivado' : 'Producto eliminado correctamente'),
                          data.archivado ? 'info' : 'exito');
        } else {
            mostrarAlerta(data.mensaje || 'No se pudo eliminar el producto', 'error');
        }
    } catch (err) { mostrarAlerta('Error al eliminar', 'error'); }
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
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No hay clientes</td></tr>';
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
                <td><span class="badge bg-${c.estado==='INACTIVO'?'secondary':'success'}">${c.estado || 'ACTIVO'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-secondary" data-accion="toggle-cliente"
                            data-id="${c.id_persona}" data-estado="${c.estado || 'ACTIVO'}" data-nombre="${c.nombres}">
                        <i class="bi bi-${c.estado==='INACTIVO'?'eye':'eye-slash'} me-1"></i>${c.estado==='INACTIVO'?'Activar':'Desactivar'}
                    </button>
                </td>
            </tr>`).join('');
    } catch (err) { console.error('Error clientes:', err); }
}

// Activar/desactivar cliente. NUNCA se elimina físicamente: el cliente
// puede tener pedidos/comprobantes emitidos que deben conservar su
// referencia (ver decisión documentada en cliente.model.js). Desactivar
// le impide iniciar sesión y hacer nuevos pedidos, sin perder su historial.
async function toggleCliente(idPersona, estadoActual, nombre) {
    const activando = estadoActual === 'INACTIVO';
    const ok = await confirmarAccion({
        tipo: 'advertencia',
        titulo: activando ? 'Activar cliente' : 'Desactivar cliente',
        mensaje: activando
            ? `¿Reactivar a "${nombre}"? Podrá iniciar sesión y comprar de nuevo.`
            : `¿Desactivar a "${nombre}"? No podrá iniciar sesión ni hacer nuevos pedidos, pero su historial de compras se conserva.`,
        textoConfirmar: activando ? 'Sí, activar' : 'Sí, desactivar'
    });
    if (!ok) return;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/clientes/${idPersona}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ estado: activando ? 'ACTIVO' : 'INACTIVO' })
        });
        if (res.ok) {
            cargarClientes();
            mostrarAlerta(`Cliente ${activando ? 'activado' : 'desactivado'} correctamente`, 'exito');
        } else {
            const e = await res.json();
            mostrarAlerta(e.mensaje || 'No se pudo cambiar el estado', 'error');
        }
    } catch (err) { mostrarAlerta('Error al cambiar el estado', 'error'); }
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
                    <button class="btn btn-sm btn-outline-success me-1" data-accion="ver-subcategorias" data-id="${c.id_categoria}" data-nombre="${c.nombre}">
                        <i class="bi bi-diagram-3"></i> Subcategorías
                    </button>
                    <button class="btn btn-sm btn-outline-primary me-1" data-accion="editar-categoria" data-id="${c.id_categoria}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" data-accion="eliminar-categoria" data-id="${c.id_categoria}">
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
        else { const e = await res.json(); mostrarAlerta(e.mensaje || 'Error al guardar'); }
    } catch (err) { mostrarAlerta('Error al guardar categoría'); }
}

async function eliminarCategoria(id) {
    const cat = categoriasLista.find(x => x.id_categoria === id);
    const ok = await confirmarAccion({
        tipo: 'peligro',
        titulo: 'Eliminar categoría',
        mensaje: `¿Eliminar la categoría "${cat ? cat.nombre : ''}"? No se podrá deshacer.`,
        textoConfirmar: 'Sí, eliminar'
    });
    if (!ok) return;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/categorias/${id}`, { method:'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
        if (res.ok) { cargarCategorias(); mostrarAlerta('Categoría eliminada correctamente', 'exito'); }
        else { const e = await res.json(); mostrarAlerta(e.mensaje || 'No se puede eliminar', 'error'); }
    } catch (err) { mostrarAlerta('Error al eliminar', 'error'); }
}

// ── Subcategorías (módulo de administración) ───────────────────
let subcategoriasListaAdmin = [];

async function abrirSubcategorias(idCategoria, nombreCategoria) {
    document.getElementById('subcat-id-categoria').value    = idCategoria;
    document.getElementById('subcat-nombre-categoria').innerText = nombreCategoria;
    document.getElementById('subcat-id-edicion').value      = '';
    document.getElementById('subcat-nombre').value           = '';
    document.getElementById('subcat-descripcion').value      = '';
    document.getElementById('subcat-btn-texto').innerText    = 'Agregar';
    await cargarSubcategoriasAdmin(idCategoria);
    modalSubcategorias.show();
}

async function cargarSubcategoriasAdmin(idCategoria) {
    const tbody = document.getElementById('tabla-subcategorias');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Cargando...</td></tr>';
    try {
        const token = localStorage.getItem('token');
        const res  = await fetch(`/api/categorias/${idCategoria}/subcategorias/admin`, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        subcategoriasListaAdmin = await res.json();
        if (!subcategoriasListaAdmin.length) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Sin subcategorías todavía</td></tr>';
            return;
        }
        tbody.innerHTML = subcategoriasListaAdmin.map(sc => `
            <tr>
                <td><strong>${sc.nombre}</strong></td>
                <td>${sc.descripcion || '-'}</td>
                <td><span class="badge bg-${sc.estado==='ACTIVO'?'success':'secondary'}">${sc.estado}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" data-accion="editar-subcategoria" data-id="${sc.id_subcategoria}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary me-1" data-accion="toggle-subcategoria" data-id="${sc.id_subcategoria}" data-estado="${sc.estado}">
                        <i class="bi bi-${sc.estado==='ACTIVO'?'eye-slash':'eye'}"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" data-accion="eliminar-subcategoria" data-id="${sc.id_subcategoria}">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>`).join('');
    } catch (err) {
        console.error('Error al cargar subcategorías:', err);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error al cargar</td></tr>';
    }
}

function editarSubcategoria(id) {
    const sc = subcategoriasListaAdmin.find(x => x.id_subcategoria === id);
    if (!sc) return;
    document.getElementById('subcat-id-edicion').value    = sc.id_subcategoria;
    document.getElementById('subcat-nombre').value         = sc.nombre;
    document.getElementById('subcat-descripcion').value    = sc.descripcion || '';
    document.getElementById('subcat-btn-texto').innerText  = 'Guardar cambios';
}

async function guardarSubcategoria() {
    const idCategoria = document.getElementById('subcat-id-categoria').value;
    const idEdicion    = document.getElementById('subcat-id-edicion').value;
    const nombre       = document.getElementById('subcat-nombre').value.trim();
    const descripcion  = document.getElementById('subcat-descripcion').value.trim();

    if (!nombre) { mostrarAlerta('Escribe un nombre para la subcategoría.'); return; }

    const url    = idEdicion ? `/api/categorias/subcategorias/${idEdicion}` : '/api/categorias/subcategorias';
    const method = idEdicion ? 'PUT' : 'POST';
    const body   = idEdicion
        ? { nombre, descripcion, estado: 'ACTIVO' }
        : { id_categoria: idCategoria, nombre, descripcion };

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify(body)
        });
        if (res.ok) {
            document.getElementById('subcat-id-edicion').value     = '';
            document.getElementById('subcat-nombre').value          = '';
            document.getElementById('subcat-descripcion').value     = '';
            document.getElementById('subcat-btn-texto').innerText   = 'Agregar';
            await cargarSubcategoriasAdmin(idCategoria);
        } else {
            const e = await res.json();
            mostrarAlerta(e.mensaje || 'Error al guardar la subcategoría');
        }
    } catch (err) { mostrarAlerta('Error al guardar la subcategoría'); }
}

async function toggleSubcategoria(id, estadoActual) {
    const nuevoEstado = estadoActual === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const sc = subcategoriasListaAdmin.find(x => x.id_subcategoria === id);
    if (!sc) return;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/categorias/subcategorias/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ nombre: sc.nombre, descripcion: sc.descripcion, estado: nuevoEstado })
        });
        if (res.ok) {
            await cargarSubcategoriasAdmin(document.getElementById('subcat-id-categoria').value);
        } else {
            const e = await res.json();
            mostrarAlerta(e.mensaje || 'No se pudo cambiar el estado');
        }
    } catch (err) { mostrarAlerta('No se pudo cambiar el estado'); }
}

async function eliminarSubcategoria(id) {
    const sc = subcategoriasListaAdmin.find(x => x.id_subcategoria === id);
    const ok = await confirmarAccion({
        tipo: 'peligro',
        titulo: 'Eliminar subcategoría',
        mensaje: `¿Eliminar la subcategoría "${sc ? sc.nombre : ''}"? No se podrá deshacer.`,
        textoConfirmar: 'Sí, eliminar'
    });
    if (!ok) return;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/categorias/subcategorias/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) {
            await cargarSubcategoriasAdmin(document.getElementById('subcat-id-categoria').value);
            mostrarAlerta('Subcategoría eliminada correctamente', 'exito');
        } else {
            const e = await res.json();
            mostrarAlerta(e.mensaje || 'No se puede eliminar: tiene productos activos asociados', 'error');
        }
    } catch (err) { mostrarAlerta('Error al eliminar la subcategoría', 'error'); }
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
    tag.innerHTML = `${valor} <i class="bi bi-x" data-accion="eliminar-tag" data-hidden-id="${hiddenId}"></i>`;
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
    const urlSubida = document.getElementById('prod-ficha-tecnica').value.trim();
    const urlManual = document.getElementById('prod-ficha-tecnica-url')?.value.trim() || '';
    const url = urlSubida || urlManual;
    if (!url) return mostrarAlerta('Primero sube un PDF o pega el enlace de Google Drive');

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
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No hay animales</td></tr>';
            return;
        }
        tbody.innerHTML = animalesLista.map(a => `
            <tr>
                <td>${a.id_tipo_animal}</td>
                <td><strong>${a.nombre}</strong></td>
                <td><span class="badge bg-${a.grupo==='MAYOR'?'warning text-dark':'info text-dark'}">${a.grupo === 'MAYOR' ? 'Animal Mayor' : 'Animal Menor'}</span></td>
                <td><span class="badge bg-${a.estado==='ACTIVO'?'success':'secondary'}">${a.estado}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" data-accion="editar-animal" data-id="${a.id_tipo_animal}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" data-accion="eliminar-animal" data-id="${a.id_tipo_animal}">
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
    document.getElementById('ani-grupo').value            = 'MENOR';
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
    document.getElementById('ani-grupo').value            = a.grupo || 'MENOR';
    document.getElementById('ani-estado').value           = a.estado;
    // Mostrar campo estado al editar
    document.getElementById('campo-ani-estado').classList.remove('d-none');
    modalAnimal.show();
}

async function guardarAnimal() {
    const id   = document.getElementById('ani-id').value;
    const data = {
        nombre: document.getElementById('ani-nombre').value,
        grupo:  document.getElementById('ani-grupo').value,
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
            mostrarAlerta(e.mensaje || 'Error al guardar');
        }
    } catch (err) {
        mostrarAlerta('Error al guardar animal');
    }
}

async function eliminarAnimal(id) {
    const a = animalesLista.find(x => x.id_tipo_animal === id);
    const ok = await confirmarAccion({
        tipo: 'peligro',
        titulo: 'Eliminar tipo de animal',
        mensaje: `¿Eliminar "${a ? a.nombre : 'este animal'}"? No se podrá deshacer.`,
        textoConfirmar: 'Sí, eliminar'
    });
    if (!ok) return;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/animales/${id}`, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
        if (res.ok) {
            document.body.classList.remove('modal-open');
            document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
            await cargarAnimales();
            mostrarAlerta('Animal eliminado correctamente', 'exito');
        } else {
            const e = await res.json();
            mostrarAlerta(e.mensaje || 'No se puede eliminar', 'error');
        }
    } catch (err) {
        mostrarAlerta('Error al eliminar', 'error');
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
                    <button class="btn btn-sm btn-outline-primary" data-accion="editar-colaborador" data-id="${c.id_colaborador}">
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
    // Al crear, el botón pasa a pedir el código de verificación en vez
    // de guardar directo — mismo texto que ya usa el móvil.
    document.getElementById('btn-guardar-colaborador-texto').innerText = 'Enviar código de verificación';
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
    // Al editar sigue siendo un guardado directo (sin OTP) — el
    // correo no se puede cambiar desde este modal.
    document.getElementById('btn-guardar-colaborador-texto').innerText = 'Guardar';
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
        // CREAR — ya no se crea directo: primero se pide el código de
        // verificación al correo (mismo flujo de 2 pasos que el móvil:
        // solicitar-creacion -> modal OTP -> confirmar-creacion). Así
        // no se puede cargar un correo inventado que nunca recibe nada.
        const pass  = document.getElementById('col-password').value;
        const pass2 = document.getElementById('col-password2').value;
        if (!pass) { mostrarAlerta('Ingresa una contraseña'); return; }
        if (pass !== pass2) { mostrarAlerta('Las contraseñas no coinciden'); return; }

        const correo = document.getElementById('col-correo').value;
        if (!correo) { mostrarAlerta('Ingresa el correo del colaborador'); return; }

        const data = {
            nombres:         document.getElementById('col-nombres').value,
            apellido_paterno:document.getElementById('col-apellido-p').value,
            apellido_materno:document.getElementById('col-apellido-m').value,
            dni:             document.getElementById('col-dni').value,
            telefono:        document.getElementById('col-telefono').value,
            correo:          correo,
            usuario:         document.getElementById('col-usuario').value,
            id_cargo:        document.getElementById('col-cargo').value,
            password:        pass
        };
        const btn = document.getElementById('btn-guardar-colaborador');
        const textoOriginal = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/colaboradores/solicitar-creacion', {
                method:'POST', headers:{'Content-Type':'application/json', 'Authorization': 'Bearer ' + token}, body: JSON.stringify(data)
            });
            const resultado = await res.json();
            if (res.ok) {
                document.getElementById('otp-colab-pending-id').value = resultado.pendingId;
                document.getElementById('otp-colab-codigo').value = '';
                document.getElementById('otp-colab-error').classList.add('d-none');
                document.getElementById('otp-colab-texto').innerText =
                    `Mandamos un código de 5 dígitos a ${correo}. Pídeselo al nuevo colaborador y escríbelo acá para confirmar que el correo es real y crear su cuenta.`;
                modalColaborador.hide();
                modalOtpColaborador.show();
            } else {
                mostrarAlerta(resultado.mensaje || 'No se pudo enviar el código');
            }
        } catch (err) {
            mostrarAlerta('Error al solicitar la creación del colaborador');
        } finally {
            btn.disabled = false;
            btn.innerHTML = textoOriginal;
        }

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
                    if (newPass !== newPass2) { mostrarAlerta('Las nuevas contraseñas no coinciden'); return; }
                    await fetch(`/api/colaboradores/${id}/reset-password`, {
                        method:'PUT', headers:{'Content-Type':'application/json', 'Authorization': 'Bearer ' + token},
                        body: JSON.stringify({ nuevaPassword: newPass })
                    });
                }
                modalColaborador.hide();
                cargarColaboradores();
                mostrarAlerta('Colaborador actualizado correctamente');
            } else { const e = await res.json(); mostrarAlerta(e.mensaje || 'Error al actualizar'); }
        } catch (err) { mostrarAlerta('Error al actualizar colaborador'); }
    }
}

// Paso 2 del flujo de creación: valida el código contra
// /api/colaboradores/confirmar-creacion — recién ahí se crea el
// colaborador de verdad (mismo endpoint que ya usa el móvil).
async function confirmarOtpColaborador() {
    const pendingId = document.getElementById('otp-colab-pending-id').value;
    const otp = document.getElementById('otp-colab-codigo').value.trim();
    const errorEl = document.getElementById('otp-colab-error');
    errorEl.classList.add('d-none');

    if (otp.length !== 5) {
        errorEl.innerText = 'Ingresa el código de 5 dígitos';
        errorEl.classList.remove('d-none');
        return;
    }

    const btn = document.getElementById('btn-confirmar-otp-colaborador');
    const textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Confirmando...';
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/colaboradores/confirmar-creacion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ pendingId, otp })
        });
        const resultado = await res.json();
        if (res.ok) {
            modalOtpColaborador.hide();
            cargarColaboradores();
            mostrarAlerta('Colaborador creado correctamente', 'exito');
        } else {
            errorEl.innerText = resultado.mensaje || 'No se pudo confirmar el código';
            errorEl.classList.remove('d-none');
        }
    } catch (err) {
        errorEl.innerText = 'Error al confirmar el código';
        errorEl.classList.remove('d-none');
    } finally {
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
    }
}

// ═══════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════
// Oculta los links del menú lateral que no corresponden al cargo del
// colaborador logueado (mismo criterio de permisos que usa el backend
// en cada ruta — ver comentario en dashboard.routes.js / producto.routes.js).
function aplicarRestriccionesPorCargo() {
    const cargo = localStorage.getItem('cargo') || '';
    document.querySelectorAll('[data-restringido]').forEach(el => {
        const nivel = el.dataset.restringido;
        const permitido =
            (nivel === 'admin' && cargo === 'Administrador') ||
            (nivel === 'admin-gerente' && (cargo === 'Administrador' || cargo === 'Gerente'));
        if (!permitido) el.classList.add('d-none');
    });
}

window.addEventListener('DOMContentLoaded', () => {
    verificarAcceso();
    aplicarRestriccionesPorCargo();
    modalProducto    = new bootstrap.Modal(document.getElementById('modalProducto'));
    modalCategoria   = new bootstrap.Modal(document.getElementById('modalCategoria'));
    modalAnimal      = new bootstrap.Modal(document.getElementById('modalAnimal'));
    modalColaborador = new bootstrap.Modal(document.getElementById('modalColaborador'));
    modalOtpColaborador = new bootstrap.Modal(document.getElementById('modalOtpColaborador'));
    modalSubcategorias = new bootstrap.Modal(document.getElementById('modalSubcategorias'));
    // modalConfirmacion ya se instancia en ui-mensajes.js (compartido con ventas/reportes)

    document.getElementById('otp-colab-codigo')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); confirmarOtpColaborador(); }
    });

    cargarEstadisticas();
    cargarGraficoProductos();
    cargarGraficoStock();
    cargarGraficoTopClientes();

    // Si llega ?seccion=, abrir esa sección del panel (navegación desde Reportes/Ventas)
    const seccionURL = new URLSearchParams(location.search).get('seccion');
    if (seccionURL) {
        const link = document.querySelector(`.sidebar .nav-link[data-valor="${seccionURL}"]`);
        mostrarSeccion(seccionURL, link);
    }
});

// ═══════════════════════════════════════════════════
//  DESPACHADOR CENTRAL DE EVENTOS (data-accion)
//
//  Antes cada botón/enlace tenía su lógica pegada directo en el
//  HTML vía onclick="...". Se reemplazó por atributos data-accion
//  (y data-valor/data-entidad/data-formato cuando hace falta) más
//  este único listener delegado, para separar HTML de JS.
//
//  Las funciones llamadas (mostrarSeccion, guardarProducto, etc.)
//  son las mismas de siempre, sin cambios en su lógica interna.
// ═══════════════════════════════════════════════════
document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-accion]');
    if (!el) return;

    // Los <a> de navegación usan href="#" solo por estilo; nunca deben navegar de verdad
    if (el.tagName === 'A') e.preventDefault();

    switch (el.dataset.accion) {
        case 'seccion':             mostrarSeccion(el.dataset.valor, el); break;
        case 'cerrar-sesion':       cerrarSesion(); break;
        case 'exportar':            exportarTabla(el.dataset.entidad, el.dataset.formato); break;
        case 'modal-producto':      mostrarModalProducto(); break;
        case 'modal-categoria':     mostrarModalCategoria(); break;
        case 'modal-animal':        mostrarModalAnimal(); break;
        case 'modal-colaborador':   mostrarModalColaborador(); break;
        case 'tab-imagen':          switchTab(el.dataset.valor, el); break;
        case 'tab-ficha':           switchTabFicha(el.dataset.valor, el); break;
        case 'ficha-tecnica':       verFichaTecnica(); break;
        case 'agregar-tag':         agregarTag(el.dataset.valor); break;
        case 'guardar-producto':    guardarProducto(); break;
        case 'guardar-categoria':   guardarCategoria(); break;
        case 'guardar-animal':      guardarAnimal(); break;
        case 'reset-password':      mostrarResetPassword(); break;
        case 'guardar-colaborador': guardarColaborador(); break;
        case 'confirmar-otp-colaborador': confirmarOtpColaborador(); break;
        case 'cambiar-vista-productos': cambiarVistaProductos(el.dataset.vistaProducto); break;

        // Generadas dinámicamente en las filas de tablas (antes onclick embebido en el template string)
        case 'cambiar-estado-producto': cambiarEstadoProducto(Number(el.dataset.id), el.dataset.estado); break;
        case 'editar-producto':         editarProducto(Number(el.dataset.id)); break;
        case 'eliminar-producto':       eliminarProducto(Number(el.dataset.id)); break;
        case 'pagina-productos':        irPaginaProductos(Number(el.dataset.pagina)); break;
        case 'editar-categoria':        editarCategoria(Number(el.dataset.id)); break;
        case 'eliminar-categoria':      eliminarCategoria(Number(el.dataset.id)); break;
        case 'ver-subcategorias':       abrirSubcategorias(Number(el.dataset.id), el.dataset.nombre); break;
        case 'toggle-cliente':          toggleCliente(Number(el.dataset.id), el.dataset.estado, el.dataset.nombre); break;
        case 'guardar-subcategoria':    guardarSubcategoria(); break;
        case 'editar-subcategoria':     editarSubcategoria(Number(el.dataset.id)); break;
        case 'toggle-subcategoria':     toggleSubcategoria(Number(el.dataset.id), el.dataset.estado); break;
        case 'eliminar-subcategoria':   eliminarSubcategoria(Number(el.dataset.id)); break;
        case 'eliminar-tag':            eliminarTag(el, el.dataset.hiddenId); break;
        case 'editar-animal':           editarAnimal(Number(el.dataset.id)); break;
        case 'eliminar-animal':         eliminarAnimal(Number(el.dataset.id)); break;
        case 'editar-colaborador':      editarColaborador(Number(el.dataset.id)); break;
    }
});