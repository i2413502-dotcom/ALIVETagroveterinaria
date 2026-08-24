const RUTA_IMG = '/img/productos/';
const IMG_ERROR = 'https://via.placeholder.com/70x70?text=Sin+Imagen';

// Esta función faltaba en este archivo — carrito.html solo carga
// carrito.js, y esta función solo estaba definida en index.js/
// perfil.js/producto.js (que NO se cargan acá). Al llamarla sin
// existir, tiraba "actualizarContadorCarrito is not defined" antes
// de llegar a renderizarCarrito(), y por eso la pantalla se quedaba
// congelada para siempre en "Cargando carrito...".
function actualizarContadorCarrito() {
    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const total   = carrito.reduce((sum, i) => sum + (i.cantidad || 0), 0);
    const badge   = document.getElementById('cart-count');
    if (badge) badge.innerText = total;
}

// Stock REAL más reciente por producto, consultado contra el backend
// (id_producto -> { stock_actual, estado }). El carrito vive en
// localStorage y nunca se actualizaba solo — si el producto se agotó
// o se desactivó DESPUÉS de agregarlo al carrito, seguía apareciendo
// disponible para comprar hasta que el pedido fallaba recién al
// finalizar. Ahora se revalida cada vez que se entra a esta página.
let _stockReal = {};

async function revalidarStockCarrito() {
    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const idsUnicos = [...new Set(carrito.map(i => i.id_producto))];
    const resultados = await Promise.all(idsUnicos.map(async (id) => {
        try {
            // GET /api/productos/:id (público) ya responde 404 si el
            // producto no está ACTIVO o su stock_actual es 0 (ver
            // producto.controller.js -> obtenerPorId) — un 404 aquí
            // significa directamente "ya no se puede comprar".
            const res = await fetch(`/api/productos/${id}`);
            if (!res.ok) return [id, { stock_actual: 0, estado: 'INACTIVO' }];
            const p = await res.json();
            return [id, { stock_actual: Number(p.stock_actual) || 0, estado: p.estado }];
        } catch (_) {
            return [id, { stock_actual: 0, estado: 'INACTIVO' }];
        }
    }));
    _stockReal = Object.fromEntries(resultados);
}

function renderizarCarrito() {
    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const container = document.getElementById('carrito-items');

    if (carrito.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-cart-x" style="font-size:4rem;color:#ccc;"></i>
                <h5 class="text-muted mt-3">Tu carrito está vacío</h5>
                <a href="/" class="btn mt-3" style="background-color:#06A049;color:white;">
                    Ver productos
                </a>
            </div>`;
        document.getElementById('subtotal').innerText = 'S/. 0.00';
        document.getElementById('total').innerText = 'S/. 0.00';
        return;
    }

    let subtotal = 0;
    let hayAgotados = false;
    container.innerHTML = '';

    carrito.forEach(item => {
        const precio    = parseFloat(item.precio) || 0;
        const cantidad  = parseInt(item.cantidad) || 1;

        // Stock real consultado al backend — si no llegó a cargar por
        // algún motivo, se asume 0 (más seguro que asumir disponible).
        const info = _stockReal[item.id_producto] || { stock_actual: 0, estado: 'INACTIVO' };
        const agotado = info.estado !== 'ACTIVO' || info.stock_actual <= 0;
        const excedeStock = !agotado && cantidad > info.stock_actual;
        if (agotado) hayAgotados = true;

        // Los productos agotados no suman al total — no se pueden comprar.
        const itemSubtotal = agotado ? 0 : precio * cantidad;
        subtotal += itemSubtotal;

        const imgVal = item.imagen ? item.imagen.trim() : '';
        const img = imgVal ? (imgVal.startsWith('http') ? imgVal : `${RUTA_IMG}${imgVal}`) : IMG_ERROR;

        // ✅ Mostrar color y talla si existen
        const detalles = [];
        if (item.color) detalles.push(`<span class="badge bg-secondary me-1">Color: ${item.color}</span>`);
        if (item.talla) detalles.push(`<span class="badge bg-secondary me-1">Talla: ${item.talla}</span>`);
        if (agotado) detalles.push(`<span class="badge bg-danger me-1">Agotado</span>`);
        else if (excedeStock) detalles.push(`<span class="badge bg-warning text-dark me-1">Solo quedan ${info.stock_actual}</span>`);
        const detallesHTML = detalles.length ? `<div class="mt-1">${detalles.join('')}</div>` : '';

        const div = document.createElement('div');
        div.className = 'card card-agro mb-3' + (agotado ? ' opacity-50' : '');
        div.innerHTML = `
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-2">
                        <img src="${img}" alt="${item.nombre}" class="cart-img"
                             onerror="this.onerror=null;this.src='${IMG_ERROR}';">
                    </div>
                    <div class="col-4">
                        <h6 class="fw-bold mb-1">${item.nombre}</h6>
                        <p class="text-muted mb-0 small">S/. ${precio.toFixed(2)} c/u</p>
                        ${detallesHTML}
                    </div>
                    <div class="col-3 d-flex align-items-center gap-2">
                        <button class="btn btn-sm btn-outline-secondary" ${agotado ? 'disabled' : ''}
                                data-accion="restar-cantidad" data-id="${item.id_producto}" data-color="${item.color || ''}" data-talla="${item.talla || ''}">-</button>
                        <input type="number" class="form-control form-control-sm cantidad-input"
                               value="${cantidad}" min="1" max="${agotado ? 0 : info.stock_actual}" ${agotado ? 'disabled' : ''}
                               data-accion="input-cantidad" data-id="${item.id_producto}" data-color="${item.color || ''}" data-talla="${item.talla || ''}">
                        <button class="btn btn-sm btn-outline-secondary" ${agotado || cantidad >= info.stock_actual ? 'disabled' : ''}
                                data-accion="sumar-cantidad" data-id="${item.id_producto}" data-color="${item.color || ''}" data-talla="${item.talla || ''}">+</button>
                    </div>
                    <div class="col-2 text-center fw-bold ${agotado ? 'text-muted' : 'text-success'}">
                        S/. ${itemSubtotal.toFixed(2)}
                    </div>
                    <div class="col-1 text-center">
                        <button class="btn btn-sm btn-danger"
                                data-accion="eliminar-producto" data-id="${item.id_producto}" data-color="${item.color || ''}" data-talla="${item.talla || ''}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>`;
        container.appendChild(div);
    });

    document.getElementById('subtotal').innerText = 'S/. ' + subtotal.toFixed(2);
    document.getElementById('total').innerText = 'S/. ' + subtotal.toFixed(2);

    // Bloquea Finalizar Compra mientras haya algo agotado en el carrito
    // — obliga a quitarlo antes de seguir, en vez de descubrirlo recién
    // en el paso de pago.
    const btnFinalizar = document.querySelector('[data-accion="finalizar-compra"]');
    if (btnFinalizar) {
        btnFinalizar.disabled = hayAgotados;
        btnFinalizar.title = hayAgotados
            ? 'Quita los productos agotados de tu carrito para continuar'
            : '';
    }
}

function cambiarCantidad(id, cantidad, color, talla) {
    cantidad = parseInt(cantidad);
    color = color || null;
    talla = talla || null;
    if (cantidad < 1) {
        eliminarProducto(id, color, talla);
        return;
    }
    // Nunca dejar que la cantidad supere el stock real ya revalidado
    // contra el backend (ver revalidarStockCarrito) — antes esto no
    // se comprobaba y se podía subir la cantidad sin límite real.
    const info = _stockReal[id];
    if (info && cantidad > info.stock_actual) {
        cantidad = info.stock_actual;
        if (cantidad < 1) {
            eliminarProducto(id, color, talla);
            alert('Ese producto ya no tiene stock disponible y se quitó del carrito.');
            return;
        }
        mostrarToastCarrito(`Solo quedan ${cantidad} unidades disponibles`);
    }
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const item = carrito.find(p => p.id_producto === id
        && (p.color || null) === color
        && (p.talla || null) === talla);
    if (item) {
        item.cantidad = cantidad;
        localStorage.setItem('carrito', JSON.stringify(carrito));
        renderizarCarrito();
        actualizarContadorCarrito();
    }
}

function eliminarProducto(id, color, talla) {
    color = color || null;
    talla = talla || null;
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    carrito = carrito.filter(p => !(p.id_producto === id
        && (p.color || null) === color
        && (p.talla || null) === talla));
    localStorage.setItem('carrito', JSON.stringify(carrito));
    renderizarCarrito();
    actualizarContadorCarrito();
}

function finalizarCompra() {
    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    if (carrito.length === 0) {
        alert('Tu carrito está vacío');
        return;
    }
    // Doble chequeo por si el botón se llegó a habilitar igual
    // (ej. estado viejo del DOM) — nunca dejar pasar un agotado.
    const hayAgotados = carrito.some(item => {
        const info = _stockReal[item.id_producto];
        return !info || info.estado !== 'ACTIVO' || info.stock_actual <= 0;
    });
    if (hayAgotados) {
        alert('Tienes productos agotados en tu carrito. Quítalos para poder continuar.');
        return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
        localStorage.setItem('redirectAfterLogin', 'envio');
        alert('Debes iniciar sesión para continuar');
        window.location.href = '/login.html';
        return;
    }
    window.location.href = '/envio.html';
}

// Toast simple reutilizando el mismo estilo que index.js/producto.js,
// sin depender de que exista el mismo elemento fijo en esta página.
function mostrarToastCarrito(texto) {
    let toast = document.getElementById('toast-carrito-stock');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-carrito-stock';
        toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;'
            + 'background:#06A049;color:white;padding:12px 18px;border-radius:8px;'
            + 'font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.2);';
        document.body.appendChild(toast);
    }
    toast.innerText = texto;
    toast.style.display = 'block';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

window.addEventListener('DOMContentLoaded', async () => {
    actualizarContadorCarrito();
    // Se pinta primero con lo que ya hay en localStorage (para que no
    // quede la pantalla en blanco esperando la red) y se vuelve a
    // pintar apenas llega el stock real revalidado.
    renderizarCarrito();
    await revalidarStockCarrito();
    renderizarCarrito();
});


// Cambia la cantidad sumando/restando 1 desde los botones +/-
function cambiarCantidadBoton(id, delta, color, talla) {
    color = color || null;
    talla = talla || null;
    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const item = carrito.find(p => p.id_producto === id
        && (p.color || null) === color
        && (p.talla || null) === talla);
    if (!item) return;
    cambiarCantidad(id, item.cantidad + delta, color, talla);
}

// Muestra el ícono de perfil en vez de "iniciar sesión" si ya hay sesión activa
function actualizarBotonUsuario() {
    const token = localStorage.getItem('token');
    const btn = document.getElementById('btn-usuario');
    if (btn && token) btn.href = '/perfil.html';
}

window.addEventListener('DOMContentLoaded', actualizarBotonUsuario);

// ═══════════════════════════════════════════════════
//  DESPACHADOR DE EVENTOS (mismo patrón que dashboard.js/index.js)
// ═══════════════════════════════════════════════════
document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-accion]');
    if (!el) return;

    const id    = Number(el.dataset.id);
    const color = el.dataset.color;
    const talla = el.dataset.talla;

    switch (el.dataset.accion) {
        case 'restar-cantidad':    cambiarCantidadBoton(id, -1, color, talla); break;
        case 'sumar-cantidad':     cambiarCantidadBoton(id, 1, color, talla); break;
        case 'eliminar-producto':  eliminarProducto(id, color, talla); break;
        case 'finalizar-compra':   finalizarCompra(); break;
    }
});

document.addEventListener('change', function (e) {
    const el = e.target.closest('[data-accion="input-cantidad"]');
    if (!el) return;
    cambiarCantidad(Number(el.dataset.id), el.value, el.dataset.color, el.dataset.talla);
});
