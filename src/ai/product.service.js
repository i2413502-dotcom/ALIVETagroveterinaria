// Búsqueda de productos reales en BD — la única fuente de verdad
const iaModel = require('../models/ia.model');
const STOP_WORDS = new Set([
    'que', 'cual', 'cuales', 'tienen', 'tiene', 'hay', 'busco', 'quiero',
    'necesito', 'precio', 'cuanto', 'cuesta', 'vale', 'el', 'la',
    'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'con', 'sin',
    'por', 'mi', 'tu', 'su', 'me', 'te', 'se', 'y', 'o', 'en', 'es', 'son',
    'venden', 'vende', 'comprar', 'algo', 'alguna', 'algun',
    'sobre', 'dame', 'dime', 'muestrame', 'ver', 'tienes', 'para'
]);


const NOMBRE_PRUEBA = /^[a-z]{3,8}(aa+|xx+|oo+|ii+|\d{2,})$/i;

const normalizar = (texto) =>
    texto.toLowerCase()
         .normalize('NFD')
         .replace(/[\u0300-\u036f]/g, '');

// Filtra productos inválidos: nombre de prueba o sin nombre real
const esProductoValido = (p) => {
    if (!p.nombre || p.nombre.trim().length < 3) return false;
    if (NOMBRE_PRUEBA.test(p.nombre.trim())) return false;
    return true;
};

// Extrae términos útiles del mensaje y busca en BD por cada uno.
// Devuelve hasta 5 productos únicos, válidos y con stock > 0 primero.
exports.buscarProductos = async (mensaje) => {
    const palabras = normalizar(mensaje)
        .replace(/[^a-z0-9ñ\s]/g, ' ')
        .split(/\s+/)
        .filter(p => p.length >= 3 && !STOP_WORDS.has(p));

    if (!palabras.length) return [];

    const encontrados = new Map();
    for (const palabra of palabras.slice(0, 5)) {
        try {
            const productos = await iaModel.searchProducts(palabra);
            for (const p of productos) {
                if (!encontrados.has(p.id) && esProductoValido(p)) {
                    encontrados.set(p.id, p);
                }
            }
        } catch (err) {
            console.error(`[AgroBot] Error buscando "${palabra}":`, err.message);
        }
        if (encontrados.size >= 5) break;
    }

    // Ordenar: con stock primero, luego sin stock
    return [...encontrados.values()]
        .sort((a, b) => (Number(b.stock_actual) > 0 ? 1 : 0) - (Number(a.stock_actual) > 0 ? 1 : 0))
        .slice(0, 5);
};
