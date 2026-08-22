let productosBase    = [];
let grupoAnimalActivo = '';
let especieAnimalActiva = ''; // id_tipo_animal elegido dentro del grupo (paso 1b), '' = todas las del grupo
let animalesConProductos = []; // ids de tipo_animal con al menos 1 producto activo
let animalesCatalogoPublico = []; // catálogo completo de /api/animales (con su grupo), para el paso 1b
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
    toast.style.display = 'flex';
    clearTimeout(toast._timeoutId);
    toast._timeoutId = setTimeout(() => { toast.style.display = 'none'; }, 2800);
}

// Obtener productos con paginación
async function obtenerProductos(filtros = {}, pagina = 1) {
    try {
        paginaActual = pagina;
        const params = new URLSearchParams({ ...filtros, pagina, limite: LIMITE });

        // Agregar filtro de grupo de animal si está activo, y de especie
        // (dentro del grupo) si el cliente afinó más la búsqueda
        if (grupoAnimalActivo) {
            params.set('grupo_animal', grupoAnimalActivo);
        }
        if (especieAnimalActiva) {
            params.set('id_tipo_animal', especieAnimalActiva);
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
                <button class="btn btn-outline-success mt-1 px-4" style="border-radius:10px;" data-accion="limpiar-filtros">
                    Ver todos los productos
                </button>
            </div>`;
        return;
    }

    contenedor.innerHTML = productos.map(p => {
        if (!p.imagen && p.imagen_principal) p.imagen = p.imagen_principal;
        const imgVal = p.imagen ? p.imagen.trim() : '';
        const img = imgVal ? (imgVal.startsWith('http') ? imgVal : `${RUTA_IMG}${imgVal}`) : IMG_ERROR;
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
                    <button class="btn-add" data-accion="agregar-carrito" data-id="${p.id_producto}">
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
        data-accion="pagina-productos" data-pagina="${paginaActual - 1}">
        ← Anterior
    </button>`;

    // Números de página (máximo 5 visibles)
    const inicio = Math.max(1, paginaActual - 2);
    const fin    = Math.min(totalPaginas, inicio + 4);

    for (let i = inicio; i <= fin; i++) {
        html += `<button class="btn btn-sm ${i === paginaActual ? 'btn-success' : 'btn-outline-success'}"
            data-accion="pagina-productos" data-pagina="${i}">${i}</button>`;
    }

    // Botón siguiente
    html += `<button class="btn btn-sm btn-outline-success"
        ${paginaActual === totalPaginas ? 'disabled' : ''}
        data-accion="pagina-productos" data-pagina="${paginaActual + 1}">
        Siguiente →
    </button>`;

    contenedor.innerHTML = html;
}

// Obtener filtros activos actualmente
function obtenerFiltrosActuales() {
    return {
        categoria:    document.getElementById('filtroCategoria')?.value    || '',
        subcategoria: document.getElementById('filtroSubcategoria')?.value || '',
        precio_min:   document.getElementById('filtroPrecioMin')?.value    || '',
        precio_max:   document.getElementById('filtroPrecioMax')?.value    || '',
    };
}

// Paso 1 de la cascada: filtrar por Grupo de animal (Mayor/Menor/Todos)
function filtrarGrupo(grupo, btn) {
    grupoAnimalActivo = grupo;
    especieAnimalActiva = ''; // cambiar de grupo reinicia la especie elegida
    document.querySelectorAll('#contenedor-grupos .btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    mostrarEspeciesDelGrupo(grupo);
    obtenerProductos(obtenerFiltrosActuales(), 1);
}

// Paso 1b: dentro del grupo elegido, mostrar botones con el nombre de
// cada especie — SOLO las que tienen al menos un producto disponible.
// Si el grupo es "Todos" (grupo === ''), no se muestra este nivel.
function mostrarEspeciesDelGrupo(grupo) {
    const wrap = document.getElementById('contenedor-especies-wrap');
    const cont = document.getElementById('contenedor-especies');

    if (!grupo) {
        wrap.classList.add('d-none');
        cont.querySelectorAll('.btn').forEach(b => b.remove());
        return;
    }

    const especies = animalesCatalogoPublico.filter(a =>
        a.grupo === grupo && animalesConProductos.includes(a.id_tipo_animal)
    );

    cont.querySelectorAll('.btn').forEach(b => b.remove());

    if (!especies.length) { wrap.classList.add('d-none'); return; }

    const btnTodos = document.createElement('button');
    btnTodos.className = 'btn btn-outline-success btn-sm active';
    btnTodos.dataset.accion = 'filtrar-especie';
    btnTodos.dataset.id = '';
    btnTodos.innerHTML = '🐾 Todos';
    cont.appendChild(btnTodos);

    especies.forEach(a => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-outline-success btn-sm';
        btn.dataset.accion = 'filtrar-especie';
        btn.dataset.id = a.id_tipo_animal;
        btn.innerHTML = a.nombre;
        cont.appendChild(btn);
    });

    wrap.classList.remove('d-none');
}

// Paso 1b: elegir una especie concreta dentro del grupo activo
function filtrarEspecie(idAnimal, btn) {
    especieAnimalActiva = idAnimal || '';
    document.querySelectorAll('#contenedor-especies .btn').forEach(b => b.classList.remove('active'));
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
    cargarFiltroSubcategorias(''); // deja el select deshabilitado de nuevo
    document.getElementById('filtroPrecioMin').value = '';
    document.getElementById('filtroPrecioMax').value = '';
    if (inputBuscador) inputBuscador.value = '';
    grupoAnimalActivo = '';
    especieAnimalActiva = '';
    mostrarEspeciesDelGrupo('');
    document.querySelectorAll('#contenedor-grupos .btn').forEach(b => b.classList.remove('active'));
    const primero = document.querySelector('#contenedor-grupos .btn');
    if (primero) primero.classList.add('active');
    obtenerProductos({}, 1);
}

// Agregar al carrito
// NOTA: antes recibía nombre/precio/imagen/stock como argumentos sueltos
// codificados a mano en el atributo onclick (con un hack de
// encodeURIComponent/decodeURIComponent para nombres con comillas).
// Ahora solo recibe el id y busca el producto en productosBase, que
// siempre refleja la última página cargada (ver obtenerProductos()).
function agregarAlCarrito(event, id) {
    event.preventDefault();
    event.stopPropagation();

    const p = productosBase.find(x => x.id_producto === id);
    if (!p) return;
    if (!p.imagen && p.imagen_principal) p.imagen = p.imagen_principal;

    const stock = parseInt(p.stock_actual) || 0;
    if (stock <= 0) { mostrarToast('Producto agotado'); return; }

    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const existe = carrito.find(item => item.id_producto === id);
    if (existe) {
        if (existe.cantidad >= stock) { alert('No hay más stock disponible'); return; }
        existe.cantidad += 1;
    } else {
        carrito.push({
            id_producto: id,
            nombre: p.nombre,
            precio: parseFloat(p.precio_venta),
            imagen: p.imagen ? p.imagen.trim() : '',
            cantidad: 1
        });
    }
    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarContadorCarrito();
    mostrarToast(p.nombre);
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

// Paso 3 de la cascada: subcategorías de la categoría elegida (paso 2).
// Si la categoría no tiene subcategorías, el select queda deshabilitado
// (la búsqueda sigue funcionando solo por categoría).
async function cargarFiltroSubcategorias(idCategoria) {
    const sel = document.getElementById('filtroSubcategoria');
    if (!sel) return;
    if (!idCategoria) {
        sel.innerHTML = '<option value="">-- Elige primero una categoría --</option>';
        sel.disabled = true;
        return;
    }
    try {
        const res  = await fetch(`/api/categorias/${idCategoria}/subcategorias`);
        const data = await res.json();
        if (!data.length) {
            sel.innerHTML = '<option value="">Sin subcategorías</option>';
            sel.disabled = true;
            return;
        }
        sel.innerHTML = '<option value="">Todas</option>' +
            data.map(sc => `<option value="${sc.id_subcategoria}">${sc.nombre}</option>`).join('');
        sel.disabled = false;
    } catch (err) {
        console.error('Error cargando subcategorías:', err);
        sel.innerHTML = '<option value="">Sin subcategorías</option>';
        sel.disabled = true;
    }
}

// Paso 1 de la cascada: botones de Grupo de animal (Mayor / Menor).
// Solo se muestran los grupos que tienen al menos un producto disponible
// (requerimiento: "si un tipo de animal no tiene productos... no debe
// mostrarse en pantalla ni aparecer como opción seleccionable").
async function cargarFiltrosGrupos() {
    try {
        const [resAnimales, resDisponibles] = await Promise.all([
            fetch('/api/animales'),
            fetch('/api/productos/meta/animales-disponibles')
        ]);
        const animales = await resAnimales.json();
        animalesConProductos = await resDisponibles.json();
        animalesCatalogoPublico = animales.filter(a => a.estado === 'ACTIVO');

        const activos = animalesCatalogoPublico.filter(a => animalesConProductos.includes(a.id_tipo_animal));
        const hayMayor = activos.some(a => a.grupo === 'MAYOR');
        const hayMenor = activos.some(a => a.grupo === 'MENOR');

        const contenedor = document.getElementById('contenedor-grupos');
        if (hayMayor) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline-success btn-sm';
            btn.dataset.accion = 'filtrar-grupo';
            btn.dataset.grupo  = 'MAYOR';
            btn.innerHTML = '🐄 Animales Mayores';
            contenedor.appendChild(btn);
        }
        if (hayMenor) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-outline-success btn-sm';
            btn.dataset.accion = 'filtrar-grupo';
            btn.dataset.grupo  = 'MENOR';
            btn.innerHTML = '🐰 Animales Menores';
            contenedor.appendChild(btn);
        }
    } catch (err) { console.error('Error cargando grupos de animal:', err); }
}

// Iniciar
window.addEventListener('DOMContentLoaded', () => {
    cargarFiltroCategorias();
    cargarFiltrosGrupos();
    obtenerProductos();
    actualizarContadorCarrito();

    // Paso 2 → 3 de la cascada: al cambiar categoría, recargar subcategorías
    document.getElementById('filtroCategoria')?.addEventListener('change', (e) => {
        cargarFiltroSubcategorias(e.target.value);
    });

    const nombre    = localStorage.getItem('nombre');
    const rol       = localStorage.getItem('rol');
    const btnUsuario = document.getElementById('btn-usuario');
    if (nombre && btnUsuario) {
        btnUsuario.href  = rol === 'COLABORADOR' ? '/dashboard.html' : '/perfil.html';
        btnUsuario.title = (rol === 'COLABORADOR' ? 'Dashboard - ' : 'Mi perfil - ') + nombre;
    }
});


// ═══════════════════════════════════════════════════
//  DESPACHADOR CENTRAL DE EVENTOS (data-accion)
//  Mismo patrón que dashboard.js: reemplaza los onclick embebidos
//  en el HTML/template-strings por delegación de eventos.
// ═══════════════════════════════════════════════════
document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-accion]');
    if (!el) return;

    switch (el.dataset.accion) {
        case 'aplicar-filtros':   aplicarFiltros(); break;
        case 'limpiar-filtros':   limpiarFiltros(); break;
        case 'filtrar-grupo':     filtrarGrupo(el.dataset.grupo, el); break;
        case 'filtrar-especie':   filtrarEspecie(el.dataset.id, el); break;
        case 'agregar-carrito':   agregarAlCarrito(e, Number(el.dataset.id)); break;
        case 'pagina-productos':  obtenerProductos(obtenerFiltrosActuales(), Number(el.dataset.pagina)); break;
    }
});
