const iaModel = require('../modelos/ia.model');

const STOP_WORDS = new Set([
    'que', 'cual', 'cuales', 'tienen', 'tiene', 'hay', 'busco', 'quiero',
    'necesito', 'precio', 'cuanto', 'cuesta', 'vale', 'el', 'la',
    'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'con', 'sin',
    'por', 'mi', 'tu', 'su', 'me', 'te', 'se', 'y', 'o', 'en', 'es', 'son',
    'venden', 'vende', 'comprar', 'algo', 'alguna', 'algun',
    'sobre', 'dame', 'dime', 'muestrame', 'ver', 'tienes', 'para'
]);

// Nombres de prueba — NO mostrar al cliente
const NOMBRE_PRUEBA = /^[a-z]{2,8}(aa+|xx+|oo+|ii+|ll+|\d{2,})$/i;

const normalizar = (texto) =>
    texto.toLowerCase()
         .normalize('NFD')
         .replace(/[\u0300-\u036f]/g, '');

// ── Mapa de categorías según nombres EXACTOS en tu BD ───────────
// tu BD tiene: 'Alimentos', 'Medicamentos', 'Accesorios'
const MAPA_CATEGORIAS = {
    // Accesorios
    'accesorio':      'Accesorios',
    'accesorios':     'Accesorios',
    'acsesorio':      'Accesorios',
    'acsesorios':     'Accesorios',
    'collar':         'Accesorios',
    'correa':         'Accesorios',
    'juguete':        'Accesorios',
    'juguetes':       'Accesorios',
    'cama':           'Accesorios',
    'camas':          'Accesorios',
    'rascador':       'Accesorios',
    'transportadora': 'Accesorios',
    'bebedero':       'Accesorios',
    'comedero':       'Accesorios',
    'plato':          'Accesorios',
    'arnés':          'Accesorios',
    'arnes':          'Accesorios',
    'jaula':          'Accesorios',
    // Medicamentos
    'medicamento':    'Medicamentos',
    'medicamentos':   'Medicamentos',
    'medicina':       'Medicamentos',
    'medicinas':      'Medicamentos',
    'pastilla':       'Medicamentos',
    'pastillas':      'Medicamentos',
    'vacuna':         'Medicamentos',
    'vacunas':        'Medicamentos',
    'antiparasitario':'Medicamentos',
    'desparasitante': 'Medicamentos',
    'antibiotico':    'Medicamentos',
    'vitamina':       'Medicamentos',
    'vitaminas':      'Medicamentos',
    'antipulgas':     'Medicamentos',
    'antiinflamatorio':'Medicamentos',
    // Alimentos
    'alimento':       'Alimentos',
    'alimentos':      'Alimentos',
    'comida':         'Alimentos',
    'croqueta':       'Alimentos',
    'croquetas':      'Alimentos',
    'concentrado':    'Alimentos',
    'balanceado':     'Alimentos',
    'snack':          'Alimentos',
    'premio':         'Alimentos',
    'premios':        'Alimentos',
    'arena':          'Alimentos',
};

const detectarCategoria = (mensaje) => {
    const palabras = normalizar(mensaje)
        .replace(/[^a-z0-9ñ\s]/g, ' ')
        .split(/\s+/);
    for (const p of palabras) {
        if (MAPA_CATEGORIAS[p]) return MAPA_CATEGORIAS[p];
    }
    return null;
};

// ── Preguntas de "superlativo": el más barato / el más caro / lo nuevo.
// La búsqueda por texto (LIKE %palabra%) NUNCA puede responder esto,
// porque no hay ningún nombre de producto que buscar — hay que ordenar
// la tabla por precio o fecha en vez de filtrar por texto. Antes esto
// devolvía 0 resultados y el bot respondía "no encontré ese producto".
const RX_BARATO = /\b(mas |más )?(barato|economico|económico|econ[oó]mico|menor precio|precio mas bajo|precio m[aá]s bajo|menos precio|el mas barato|el m[aá]s barato)\b/;
const RX_CARO   = /\b(mas |más )?(caro|costoso|mayor precio|precio mas alto|precio m[aá]s alto|el mas caro|el m[aá]s caro)\b/;
const RX_NUEVO  = /\b(nuevo|nuevos|reci[eé]n llegado|recien llegado|ultimos productos|últimos productos|lo nuevo|novedades)\b/;
const RX_VENDIDO = /\b(mas |más )?(vendido|vendidos|popular|populares|se vende mas|se vende más|top ventas|el mas vendido|el m[aá]s vendido|que se vende mas|qu[eé] se vende m[aá]s)\b/;
const RX_STOCK   = /\b(mayor stock|mas stock|más stock|mayor existencia|mayores existencias|mas existencias|más existencias|mas disponibilidad|más disponibilidad|que tiene mas stock|qu[eé] tiene m[aá]s stock|m[aá]s unidades)\b/;

const detectarIntencionExtremo = (mensaje) => {
    const txt = normalizar(mensaje);
    if (RX_VENDIDO.test(txt)) return 'VENDIDO';
    if (RX_STOCK.test(txt))   return 'STOCK';
    if (RX_BARATO.test(txt)) return 'BARATO';
    if (RX_CARO.test(txt))   return 'CARO';
    if (RX_NUEVO.test(txt))  return 'NUEVO';
    return null;
};

const esProductoValido = (p) => {
    if (!p.nombre || p.nombre.trim().length < 3) return false;
    if (NOMBRE_PRUEBA.test(p.nombre.trim())) return false;
    return true;
};

exports.buscarProductos = async (mensaje) => {
    const categoria = detectarCategoria(mensaje);

    // 1) ¿Es una pregunta de "el más barato/caro/nuevo"? Resolver con
    //    ORDER BY, no con búsqueda de texto.
    const intencion = detectarIntencionExtremo(mensaje);
    if (intencion) {
        try {
            let productos;
            if (intencion === 'NUEVO')        productos = await iaModel.getProductosNuevos(categoria);
            else if (intencion === 'VENDIDO') productos = await iaModel.getProductosMasVendidos(categoria);
            else if (intencion === 'STOCK')   productos = await iaModel.getProductosMasStock(categoria);
            else                              productos = await iaModel.getProductosExtremos(intencion, categoria);

            const validos = productos.filter(esProductoValido);
            if (validos.length > 0) return validos;
            // Si no hay nada en esa categoría, seguir con la búsqueda normal
            // por si el mensaje también tenía palabras clave de producto.
        } catch (err) {
            console.error(`[AgroBot] Error en consulta de extremos (${intencion}):`, err.message);
        }
    }

    const palabrasClave = normalizar(mensaje)
        .replace(/[^a-z0-9ñ\s]/g, ' ')
        .split(/\s+/)
        .filter(p => p.length >= 3 && !STOP_WORDS.has(p) && !MAPA_CATEGORIAS[p]);

    const encontrados = new Map();

    // Búsqueda con términos específicos + filtro de categoría
    if (palabrasClave.length > 0) {
        for (const termino of palabrasClave.slice(0, 4)) {
            try {
                const productos = await iaModel.searchProducts(termino, categoria);
                for (const p of productos) {
                    if (!encontrados.has(p.id) && esProductoValido(p))
                        encontrados.set(p.id, p);
                }
            } catch (err) {
                console.error(`[AgroBot] Error buscando "${termino}":`, err.message);
            }
            if (encontrados.size >= 6) break;
        }
    }

    // Si no encontró nada con términos pero hay categoría → traer toda la categoría
    if (encontrados.size === 0 && categoria) {
        try {
            const productos = await iaModel.searchProducts('', categoria);
            for (const p of productos) {
                if (esProductoValido(p)) encontrados.set(p.id, p);
            }
        } catch (err) {
            console.error(`[AgroBot] Error categoría "${categoria}":`, err.message);
        }
    }

    // Sin categoría → búsqueda general solo por nombre
    if (encontrados.size === 0 && palabrasClave.length > 0) {
        for (const termino of palabrasClave.slice(0, 3)) {
            try {
                const productos = await iaModel.searchProducts(termino, null);
                for (const p of productos) {
                    if (!encontrados.has(p.id) && esProductoValido(p))
                        encontrados.set(p.id, p);
                }
            } catch (err) {
                console.error(`[AgroBot] Error general "${termino}":`, err.message);
            }
        }
    }

    return [...encontrados.values()]
        .sort((a, b) => Number(b.stock_actual) - Number(a.stock_actual))
        .slice(0, 5);
};