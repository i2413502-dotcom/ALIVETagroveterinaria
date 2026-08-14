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

const esProductoValido = (p) => {
    if (!p.nombre || p.nombre.trim().length < 3) return false;
    if (NOMBRE_PRUEBA.test(p.nombre.trim())) return false;
    return true;
};

exports.buscarProductos = async (mensaje) => {
    const categoria = detectarCategoria(mensaje);

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