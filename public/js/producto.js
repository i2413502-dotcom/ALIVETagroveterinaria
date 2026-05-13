const RUTA_IMG = '/img/productos/';
const IMG_ERROR = 'https://via.placeholder.com/400x400?text=Sin+Imagen';

function convertirUrlDrive(url) {
    if (!url) return '#';
    const matchOpen = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchOpen) {
        return `https://drive.google.com/file/d/${matchOpen[1]}/view`;
    }
    return url;
}

function actualizarContadorCarrito() {
    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const total   = carrito.reduce((sum, i) => sum +
     i.cantidad, 0);
    const badge   = document.getElementById('cart-count');
    if (badge) badge.innerText = total;
}

function obtenerIdDesdeURL() {
    return new URLSearchParams(window.location.search).get('id');
}

function detectarTipo(categoria) {
    const c = (categoria || '').toLowerCase();
    if (c.includes('medic') || c.includes('farmac') || c.includes('veterinari')) return 'medicamento';
    if (c.includes('aliment') || c.includes('comida') || c.includes('nutrici'))  return 'alimento';
    if (c.includes('acces') || c.includes('juguete') || c.includes('collar'))    return 'accesorio';
    return 'general';
}

function construirFichaTecnica(p) {
    const tipo = detectarTipo(p.categoria);

    const filaMarca = p.marca
        ? `<tr><td class="fw-bold bg-light" style="width:38%">Marca</td><td>${p.marca}</td></tr>` : '';
    const filaPeso = p.peso_presentacion
        ? `<tr><td class="fw-bold bg-light">Presentación</td><td>${p.peso_presentacion}</td></tr>` : '';
    const filaVence = p.fecha_vencimiento
        ? `<tr><td class="fw-bold bg-light">Vencimiento</td>
               <td>${new Date(p.fecha_vencimiento).toLocaleDateString('es-PE')}</td></tr>` : '';

    if (tipo === 'medicamento') {
        const filas = [
            filaMarca, filaPeso,
            p.composicion   ? `<tr><td class="fw-bold bg-light">Composición</td><td>${p.composicion}</td></tr>` : '',
            p.modo_uso      ? `<tr><td class="fw-bold bg-light">Modo de uso</td><td>${p.modo_uso}</td></tr>`    : '',
            p.ficha_tecnica ? `<tr><td class="fw-bold bg-light">Ficha Técnica</td><td>
    <a href="${convertirUrlDrive(p.ficha_tecnica)}" target="_blank"
       class="btn btn-sm btn-danger">
        <i class="bi bi-file-earmark-pdf-fill me-1"></i>Ver Ficha Técnica (PDF)
    </a>
</td></tr>` : '',

            filaVence
        ].filter(Boolean).join('');

        if (!filas) return '';
        return `
        <div class="mt-4">
            <h5 class="fw-bold text-success border-bottom pb-2">
                <i class="bi bi-clipboard2-pulse me-2"></i>Ficha Técnica
            </h5>
            <table class="table table-sm table-bordered">${filas}</table>
            <div class="alert alert-warning mt-2 small">
                <i class="bi bi-exclamation-triangle me-2"></i>
                <strong>Advertencia:</strong> Consulte con un veterinario antes de administrar.
            </div>
        </div>`;

    } else if (tipo === 'alimento') {
        const filas = [
            filaMarca, filaPeso,
            p.composicion   ? `<tr><td class="fw-bold bg-light">Composición</td><td>${p.composicion}</td></tr>`        : '',
            p.ficha_tecnica ? `<tr><td class="fw-bold bg-light">Info. nutricional</td><td>${p.ficha_tecnica}</td></tr>` : '',
            filaVence
        ].filter(Boolean).join('');

        if (!filas) return '';
        return `
        <div class="mt-4">
            <h5 class="fw-bold text-success border-bottom pb-2">
                <i class="bi bi-egg-fried me-2"></i>Información del Producto
            </h5>
            <table class="table table-sm table-bordered">${filas}</table>
        </div>`;

    } else if (tipo === 'accesorio') {
        // Colores como badges — el cliente solo ve, no elige aquí
        const coloresBadges = p.colores
            ? `<tr><td class="fw-bold bg-light">Colores disponibles</td><td>
                ${p.colores.split(',').map(c =>
                    `<span class="badge rounded-pill me-1 mb-1"
                           style="background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7">
                        ${c.trim()}
                    </span>`
                ).join('')}
               </td></tr>` : '';

        // Tallas como botones visuales
        const tallasBotones = p.tallas
            ? `<tr><td class="fw-bold bg-light">Tallas disponibles</td><td>
                ${p.tallas.split(',').map(t =>
                    `<span class="btn btn-sm btn-outline-secondary me-1 mb-1"
                           style="pointer-events:none;border-radius:6px">
                        ${t.trim()}
                    </span>`
                ).join('')}
               </td></tr>` : '';

        const filas = [filaMarca, coloresBadges, tallasBotones,
            p.ficha_tecnica ? `<tr><td class="fw-bold bg-light">Especificaciones</td><td>${p.ficha_tecnica}</td></tr>` : ''
        ].filter(Boolean).join('');

        if (!filas) return '';
        return `
        <div class="mt-4">
            <h5 class="fw-bold text-success border-bottom pb-2">
                <i class="bi bi-tags me-2"></i>Detalles del Producto
            </h5>
            <table class="table table-sm table-bordered">${filas}</table>
        </div>`;

    } else {
        const filas = [filaMarca, filaPeso, filaVence,
            p.ficha_tecnica ? `<tr><td class="fw-bold bg-light">Descripción técnica</td><td>${p.ficha_tecnica}</td></tr>` : ''
        ].filter(Boolean).join('');
        if (!filas) return '';
        return `
        <div class="mt-4">
            <h5 class="fw-bold text-success border-bottom pb-2">
                <i class="bi bi-info-circle me-2"></i>Información del Producto
            </h5>
            <table class="table table-sm table-bordered">${filas}</table>
        </div>`;
    }
}

// Selector de color y talla para accesorios
function construirSelectorAtributos(p) {
    const tipo = detectarTipo(p.categoria);
    if (tipo !== 'accesorio') return '';

    let html = '';

    if (p.colores) {
        const colores = p.colores.split(',').map(c => c.trim()).filter(Boolean);
        if (colores.length > 0) {
            html += `
            <div class="mb-3">
                <label class="fw-bold mb-2">Color:</label>
                <div class="d-flex flex-wrap gap-2" id="selector-colores">
                    ${colores.map((c, i) => `
                        <button type="button"
                            class="btn btn-sm ${i === 0 ? 'btn-success' : 'btn-outline-secondary'}"
                            style="border-radius:20px; min-width:70px"
                            onclick="seleccionarOpcion(this, 'selector-colores')">
                            ${c}
                        </button>`).join('')}
                </div>
            </div>`;
        }
    }

    if (p.tallas) {
        const tallas = p.tallas.split(',').map(t => t.trim()).filter(Boolean);
        if (tallas.length > 0) {
            html += `
            <div class="mb-3">
                <label class="fw-bold mb-2">Talla:</label>
                <div class="d-flex flex-wrap gap-2" id="selector-tallas">
                    ${tallas.map((t, i) => `
                        <button type="button"
                            class="btn btn-sm ${i === 0 ? 'btn-success' : 'btn-outline-secondary'}"
                            style="border-radius:6px; min-width:50px; font-weight:600"
                            onclick="seleccionarOpcion(this, 'selector-tallas')">
                            ${t}
                        </button>`).join('')}
                </div>
            </div>`;
        }
    }

    return html;
}

function seleccionarOpcion(btn, grupoId) {
    document.querySelectorAll(`#${grupoId} button`).forEach(b => {
        b.className = 'btn btn-sm btn-outline-secondary';
        b.style.cssText = 'border-radius:' + (grupoId === 'selector-colores' ? '20px' : '6px') + ';min-width:' + (grupoId === 'selector-colores' ? '70px' : '50px') + ';font-weight:600';
    });
    btn.className = 'btn btn-sm btn-success';
}

async function cargarDetalleProducto() {
    const id = obtenerIdDesdeURL();
    if (!id) {
        document.getElementById('producto-detalle').innerHTML =
            '<p class="text-danger">Producto no especificado.</p>';
        return;
    }

    try {
        const res = await fetch(`/api/productos/${id}`);
        if (!res.ok) throw new Error('Producto no encontrado');
        const p = await res.json();

        const img              = p.imagen ? `${RUTA_IMG}${p.imagen.trim()}` : IMG_ERROR;
        const fichaTecnica     = construirFichaTecnica(p);
        const selectorAtributos = construirSelectorAtributos(p);

        // Stock solo para saber si hay o no — no se muestra al cliente
        const sinStock = p.stock_actual <= 0;

        document.getElementById('producto-detalle').innerHTML = `
            <div class="col-md-6 text-center">
                <img src="${img}" alt="${p.nombre}" class="product-img shadow img-fluid"
                     onerror="this.onerror=null;this.src='${IMG_ERROR}';">
            </div>
            <div class="col-md-6">
                <nav aria-label="breadcrumb">
                    <ol class="breadcrumb small">
                        <li class="breadcrumb-item"><a href="/" class="text-success">Inicio</a></li>
                        <li class="breadcrumb-item"><a href="/" class="text-success">${p.categoria || 'General'}</a></li>
                        <li class="breadcrumb-item active">${p.nombre}</li>
                    </ol>
                </nav>

                <div class="mb-2">
                    <span class="badge bg-success">${p.categoria || 'General'}</span>
                    ${p.tipo_animal ? `<span class="badge bg-info text-dark ms-1">${p.tipo_animal}</span>` : ''}
                    ${p.marca      ? `<span class="badge bg-secondary ms-1">${p.marca}</span>`             : ''}
                </div>

                <h2 class="fw-bold mt-1">${p.nombre}</h2>
                <h3 class="text-success fw-bold">S/. ${parseFloat(p.precio_venta).toFixed(2)}</h3>
                <p class="text-muted">${p.descripcion || ''}</p>

                ${selectorAtributos}

                <div class="d-flex align-items-center gap-3 mb-4">
                    <label class="fw-bold">Cantidad:</label>
                    <div class="d-flex align-items-center gap-2">
                        <button class="btn btn-outline-secondary btn-sm rounded-circle"
                                onclick="restar()">-</button>
                        <input type="number" id="cantidad" value="1" min="1" max="${p.stock_actual}"
                               class="form-control text-center" style="width:65px;">
                        <button class="btn btn-outline-secondary btn-sm rounded-circle"
                                onclick="sumar(${p.stock_actual})">+</button>
                    </div>
                </div>

                <div class="d-flex gap-2 flex-wrap">
                    ${!sinStock ? `
                    <button class="btn btn-success px-4 py-2"
                            onclick="agregarAlCarrito(${p.id_producto},
                                '${p.nombre.replace(/'/g, "\\'")}',
                                ${p.precio_venta},
                                '${p.imagen ? p.imagen.trim() : ''}',
                                ${p.stock_actual})">
                        <i class="bi bi-cart-plus me-2"></i>Agregar al carrito
                    </button>` :
                    `<span class="btn btn-secondary px-4 py-2 disabled">
                        <i class="bi bi-x-circle me-2"></i>Agotado
                    </span>`}
                    <a href="/" class="btn btn-outline-secondary px-4 py-2">
                        <i class="bi bi-arrow-left me-2"></i>Volver
                    </a>
                </div>

                ${fichaTecnica}
            </div>`;

        cargarRecomendados(p.id_categoria, p.id_producto);

    } catch (error) {
        document.getElementById('producto-detalle').innerHTML =
            `<p class="text-danger">${error.message}</p>`;
    }
}

function restar() {
    const input = document.getElementById('cantidad');
    if (parseInt(input.value) > 1) input.value = parseInt(input.value) - 1;
}

function sumar(stock) {
    const input = document.getElementById('cantidad');
    if (parseInt(input.value) < stock) input.value = parseInt(input.value) + 1;
}

function agregarAlCarrito(id, nombre, precio, imagen, stock) {
    const cantidad = parseInt(document.getElementById('cantidad').value);
    if (cantidad < 1 || cantidad > stock) { alert('Cantidad no válida'); return; }

    // ✅ Capturar color y talla seleccionados si existen
    const colorBtn = document.querySelector('#selector-colores .btn-success');
    const tallaBtn = document.querySelector('#selector-tallas .btn-success');
    const colorElegido = colorBtn ? colorBtn.innerText.trim() : null;
    const tallaElegida = tallaBtn ? tallaBtn.innerText.trim() : null;

    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const existe = carrito.find(p => p.id_producto === id
        && p.color === colorElegido
        && p.talla === tallaElegida);

    if (existe) {
        if (existe.cantidad + cantidad > stock) { alert('No hay suficiente stock'); return; }
        existe.cantidad += cantidad;
    } else {
        carrito.push({
            id_producto: id,
            nombre,
            precio: parseFloat(precio),
            imagen,
            cantidad,
            color: colorElegido,
            talla: tallaElegida
        });
    }

    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarContadorCarrito();

    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#06A049;color:white;padding:12px 20px;border-radius:10px;z-index:9999;box-shadow:0 4px 15px rgba(0,0,0,0.2);';
    toast.innerHTML = `<i class="bi bi-cart-check me-2"></i>"${nombre}" agregado al carrito`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

async function cargarRecomendados(idCategoria, idActual) {
    try {
        const res      = await fetch(`/api/productos?categoria=${idCategoria}&limite=5`);
        const data     = await res.json();
        const lista    = Array.isArray(data) ? data : (data.productos || []);
        const filtrados = lista.filter(p => p.id_producto !== parseInt(idActual));

        if (!filtrados.length) {
            document.getElementById('productos-recomendados').innerHTML =
                '<p class="text-muted">No hay recomendaciones disponibles.</p>';
            return;
        }

        document.getElementById('productos-recomendados').innerHTML = filtrados.map(p => {
            const img = p.imagen ? `${RUTA_IMG}${p.imagen.trim()}` : IMG_ERROR;
            return `
            <div class="col-6 col-md-3">
                <div class="card card-agro recomendado-card h-100">
                    <a href="/detalleproducto.html?id=${p.id_producto}" class="text-decoration-none">
                        <img src="${img}" alt="${p.nombre}" class="card-img-top"
                             style="height:175px;object-fit:cover;border-radius:14px 14px 0 0;"
                             onerror="this.onerror=null;this.src='${IMG_ERROR}';">
                        <div class="card-body p-3 text-center">
                            <h6 class="fw-bold text-truncate mb-1" style="color:#1E2D24;font-size:0.85rem;">${p.nombre}</h6>
                            <p class="fw-800 mb-0" style="color:#047a37;font-weight:800;font-size:1rem;">S/. ${parseFloat(p.precio_venta).toFixed(2)}</p>
                        </div>
                    </a>
                </div>
            </div>`;
        }).join('');

    } catch (err) {
        document.getElementById('productos-recomendados').innerHTML = '';
    }
}

window.addEventListener('DOMContentLoaded', () => {
    cargarDetalleProducto();
    actualizarContadorCarrito();
});