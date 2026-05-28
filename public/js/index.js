let productosBase    = [];
let filtroAnimalActivo = 0;
let paginaActual     = 1;
const LIMITE         = 20;
const RUTA_IMG       = '/img/productos/';
const IMG_ERROR      = 'https://via.placeholder.com/300x300?text=Sin+Imagen';

// Actualizar contador carrito
function actualizarContadorCarrito() {
    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const total   = carrito.reduce((sum, i) => sum + i.cantidad, 0);
    const badge   = document.getElementById('cart-count');
    if (badge) badge.innerText = total;
}

// Mostrar toast
function mostrarToast(nombre) {
    const toast = document.getElementById('toastCarrito');
    const msg   = document.getElementById('toast-mensaje');
    msg.innerText = `"${nombre}" agregado al carrito`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2500);
}

// Obtener productos con paginación
async function obtenerProductos(filtros = {}, pagina = 1) {
    try {
        paginaActual = pagina;
        const params = new URLSearchParams({ ...filtros, pagina, limite: LIMITE });

        // Agregar filtro animal si está activo
        if (filtroAnimalActivo > 0) {
            params.set('id_tipo_animal', filtroAnimalActivo);
        }

        const res  = await fetch('/api/productos?' + params.toString());
        const data = await res.json();

        productosBase = data.productos;
        renderizarProductos(data.productos);
        renderizarPaginacion(data.pagina, data.totalPaginas, data.total, filtros);

    } catch (err) {
        console.error('Error:', err);
        document.getElementById('lista-productos').innerHTML =
            '<p class="text-center text-danger">Error al conectar con el servidor.</p>';
    }
}

// Renderizar productos
function renderizarProductos(productos) {
    const contenedor = document.getElementById('lista-productos');
    const contador   = document.getElementById('contador-productos');
    if (!contenedor) return;

    if (!productos || !productos.length) {
        contenedor.innerHTML = `
            <div class="col-12 text-center py-5 text-muted">
                <i class="bi bi-search" style="font-size:3rem;opacity:0.35;"></i>
                <h5 class="mt-3 fw-bold">No se encontraron productos</h5>
                <p class="small">Intenta con otros filtros o busca algo diferente.</p>
                <button class="btn btn-outline-success mt-1 px-4" style="border-radius:10px;" onclick="limpiarFiltros()">
                    Ver todos los productos
                </button>
            </div>`;
        return;
    }

    contenedor.innerHTML = productos.map(p => {
        const img        = p.imagen ? `${RUTA_IMG}${p.imagen.trim()}` : IMG_ERROR;
        const stockBadge = p.stock_actual <= 5
            ? `<span class="stock-badge-low"><i class="bi bi-exclamation-triangle-fill me-1"></i>Poco stock</span>`
            : '';
        return `
        <div class="col-6 col-md-3 mb-4">
            <div class="card product-card position-relative">
                <a href="/detalleproducto.html?id=${p.id_producto}" class="text-decoration-none">
                    <div class="product-img-container">
                        ${stockBadge}
                        <img src="${img}" class="product-img" alt="${p.nombre}"
                             onerror="this.onerror=null;this.src='${IMG_ERROR}';">
                    </div>
                </a>
                <div class="card-body p-3">
                    <p class="producto-categoria">${p.categoria || 'General'}</p>
                    <h6 class="producto-nombre">${p.nombre}</h6>
                    <div class="d-flex align-items-center justify-content-between mb-3">
                        <span class="producto-precio">S/. ${parseFloat(p.precio_venta).toFixed(2)}</span>
                    </div>
                    <button class="btn-add" onclick="agregarAlCarrito(event,
                        ${p.id_producto},
                        decodeURIComponent('${encodeURIComponent(p.nombre)}'),
                        ${p.precio_venta},
                        '${p.imagen ? p.imagen.trim() : ''}',
                        ${p.stock_actual || 0})">
                        <i class="bi bi-cart-plus"></i>Agregar
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// Renderizar paginación
function renderizarPaginacion(paginaActual, totalPaginas, totalProductos, filtros) {
    let contenedor = document.getElementById('paginacion');

    // Si no existe el contenedor, créalo debajo de los productos
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'paginacion';
        contenedor.className = 'col-12 d-flex justify-content-center align-items-center gap-2 mt-2 mb-4 flex-wrap';
        document.getElementById('lista-productos').parentNode.appendChild(contenedor);
    }

    if (totalPaginas <= 1) {
        contenedor.innerHTML = '';
        return;
    }

    let html = `
        <span class="text-muted small me-2">
            Mostrando página ${paginaActual} de ${totalPaginas} (${totalProductos} productos)
        </span>`;

    // Botón anterior
    html += `<button class="btn btn-sm btn-outline-success"
        ${paginaActual === 1 ? 'disabled' : ''}
        onclick="obtenerProductos(obtenerFiltrosActuales(), ${paginaActual - 1})">
        ← Anterior
    </button>`;

    // Números de página (máximo 5 visibles)
    const inicio = Math.max(1, paginaActual - 2);
    const fin    = Math.min(totalPaginas, inicio + 4);

    for (let i = inicio; i <= fin; i++) {
        html += `<button class="btn btn-sm ${i === paginaActual ? 'btn-success' : 'btn-outline-success'}"
            onclick="obtenerProductos(obtenerFiltrosActuales(), ${i})">${i}</button>`;
    }

    // Botón siguiente
    html += `<button class="btn btn-sm btn-outline-success"
        ${paginaActual === totalPaginas ? 'disabled' : ''}
        onclick="obtenerProductos(obtenerFiltrosActuales(), ${paginaActual + 1})">
        Siguiente →
    </button>`;

    contenedor.innerHTML = html;
}

// Obtener filtros activos actualmente
function obtenerFiltrosActuales() {
    return {
        categoria:  document.getElementById('filtroCategoria')?.value  || '',
        precio_min: document.getElementById('filtroPrecioMin')?.value  || '',
        precio_max: document.getElementById('filtroPrecioMax')?.value  || '',
    };
}

// Filtrar por animal
function filtrarAnimal(idAnimal, btn) {
    filtroAnimalActivo = idAnimal;
    document.querySelectorAll('.filtro-animal .btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    obtenerProductos(obtenerFiltrosActuales(), 1);
}

// Buscador en tiempo real (con debounce para no saturar)
let timerBusqueda;
const inputBuscador = document.getElementById('inputBuscador');
if (inputBuscador) {
    inputBuscador.addEventListener('input', (e) => {
        clearTimeout(timerBusqueda);
        timerBusqueda = setTimeout(() => {
            const filtros = obtenerFiltrosActuales();
            filtros.nombre = e.target.value;
            obtenerProductos(filtros, 1);
        }, 400); // espera 400ms después de que el usuario deja de escribir
    });
}

// Aplicar filtros
function aplicarFiltros() {
    obtenerProductos(obtenerFiltrosActuales(), 1);
}

// Limpiar filtros
function limpiarFiltros() {
    document.getElementById('filtroCategoria').value = '';
    document.getElementById('filtroPrecioMin').value = '';
    document.getElementById('filtroPrecioMax').value = '';
    if (inputBuscador) inputBuscador.value = '';
    filtroAnimalActivo = 0;
    document.querySelectorAll('.filtro-animal .btn').forEach(b => b.classList.remove('active'));
    const primero = document.querySelector('.filtro-animal .btn');
    if (primero) primero.classList.add('active');
    obtenerProductos({}, 1);
}

// Agregar al carrito
function agregarAlCarrito(event, id, nombre, precio, imagen, stock) {
    event.preventDefault();
    event.stopPropagation();
    stock = parseInt(stock) || 0;
    if (stock <= 0) { mostrarToast('Producto agotado'); return; }

    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const existe = carrito.find(p => p.id_producto === id);
    if (existe) {
        if (existe.cantidad >= stock) { alert('No hay más stock disponible'); return; }
        existe.cantidad += 1;
    } else {
        carrito.push({ id_producto: id, nombre, precio: parseFloat(precio), imagen, cantidad: 1 });
    }
    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarContadorCarrito();
    mostrarToast(nombre);
}

// Cargar opciones de categoría dinámicamente desde la BD
async function cargarFiltroCategorias() {
    try {
        const res  = await fetch('/api/categorias');
        const cats = await res.json();
        const sel  = document.getElementById('filtroCategoria');
        if (!sel) return;
        sel.innerHTML = '<option value="">Todas las categorías</option>' +
            cats.filter(c => c.estado === 'ACTIVO')
                .map(c => `<option value="${c.id_categoria}">${c.nombre}</option>`).join('');
    } catch (err) { console.error('Error cargando categorías:', err); }
}

// Cargar botones de animales dinámicamente
async function cargarFiltrosAnimales() {
    try {
        const res      = await fetch('/api/animales');
        const animales = await res.json();
        const emojis   = {
            'Perro':'🐶','Gato':'🐱','Ave':'🐔','Conejo':'🐰',
            'conejo':'🐰','Camello':'🐪','cerdo':'🐷','Cerdo':'🐷',
            'Vaca':'🐄','Caballo':'🐴','Oveja':'🐑'
        };
        const contenedor = document.getElementById('contenedor-animales');
        animales.filter(a => a.estado === 'ACTIVO').forEach(a => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline-success btn-sm';
            btn.onclick   = function() { filtrarAnimal(a.id_tipo_animal, this); };
            btn.innerHTML = `${emojis[a.nombre] || '🐾'} ${a.nombre}`;
            contenedor.appendChild(btn);
        });
    } catch (err) { console.error('Error cargando animales:', err); }
}

// Iniciar
window.addEventListener('DOMContentLoaded', () => {
    cargarFiltroCategorias();
    cargarFiltrosAnimales();
    obtenerProductos();
    actualizarContadorCarrito();

    const nombre    = localStorage.getItem('nombre');
    const rol       = localStorage.getItem('rol');
    const btnUsuario = document.getElementById('btn-usuario');
    if (nombre && btnUsuario) {
        btnUsuario.href  = rol === 'COLABORADOR' ? '/dashboard.html' : '/perfil.html';
        btnUsuario.title = (rol === 'COLABORADOR' ? 'Dashboard - ' : 'Mi perfil - ') + nombre;
    }
});