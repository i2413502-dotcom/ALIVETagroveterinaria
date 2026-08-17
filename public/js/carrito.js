const RUTA_IMG = '/img/productos/';
const IMG_ERROR = 'https://via.placeholder.com/70x70?text=Sin+Imagen';

function actualizarContadorCarrito() {
    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const total = carrito.reduce((sum, i) => sum + (i.cantidad || 0), 0);
    const badge = document.getElementById('cart-count');
    if (badge) badge.innerText = total;
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
    container.innerHTML = '';

    carrito.forEach(item => {
        const precio    = parseFloat(item.precio) || 0;
        const cantidad  = parseInt(item.cantidad) || 1;
        const itemSubtotal = precio * cantidad;
        subtotal += itemSubtotal;

        const imgVal = item.imagen ? item.imagen.trim() : '';
        const img = imgVal ? (imgVal.startsWith('http') ? imgVal : `${RUTA_IMG}${imgVal}`) : IMG_ERROR;

        // ✅ Mostrar color y talla si existen
        const detalles = [];
        if (item.color) detalles.push(`<span class="badge bg-secondary me-1">Color: ${item.color}</span>`);
        if (item.talla) detalles.push(`<span class="badge bg-secondary me-1">Talla: ${item.talla}</span>`);
        const detallesHTML = detalles.length ? `<div class="mt-1">${detalles.join('')}</div>` : '';

        const div = document.createElement('div');
        div.className = 'card card-agro mb-3';
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
                        <button class="btn btn-sm btn-outline-secondary"
                                data-accion="restar-cantidad" data-id="${item.id_producto}" data-color="${item.color || ''}" data-talla="${item.talla || ''}">-</button>
                        <input type="number" class="form-control form-control-sm cantidad-input"
                               value="${cantidad}" min="1"
                               data-accion="input-cantidad" data-id="${item.id_producto}" data-color="${item.color || ''}" data-talla="${item.talla || ''}">
                        <button class="btn btn-sm btn-outline-secondary"
                                data-accion="sumar-cantidad" data-id="${item.id_producto}" data-color="${item.color || ''}" data-talla="${item.talla || ''}">+</button>
                    </div>
                    <div class="col-2 text-center fw-bold text-success">
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
}

function cambiarCantidad(id, cantidad, color, talla) {
    cantidad = parseInt(cantidad);
    color = color || null;
    talla = talla || null;
    if (cantidad < 1) {
        eliminarProducto(id, color, talla);
        return;
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
    const token = localStorage.getItem('token');
    if (!token) {
        localStorage.setItem('redirectAfterLogin', 'envio');
        alert('Debes iniciar sesión para continuar');
        window.location.href = '/login.html';
        return;
    }
    window.location.href = '/envio.html';
}

window.addEventListener('DOMContentLoaded', () => {
    renderizarCarrito();
    actualizarContadorCarrito();
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
