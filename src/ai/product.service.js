// Búsqueda de productos reales en BD — la única fuente de verdad
// que la IA puede citar sobre precios, stock y catálogo.
const iaModel = require('../models/ia.model');

// Palabras que no aportan a la búsqueda de producto
const STOP_WORDS = new Set([
    'que', 'cual', 'cuales', 'tienen', 'tiene', 'hay', 'busco', 'quiero',
    'necesito', 'para', 'precio', 'cuanto', 'cuesta', 'vale', 'el', 'la',
    'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'con', 'sin',
    'por', 'mi', 'tu', 'su', 'me', 'te', 'se', 'y', 'o', 'en', 'es', 'son',
    'stock', 'venden', 'vende', 'comprar', 'producto', 'productos', 'algo',
    'alguna', 'algun', 'algún', 'sobre', 'dame', 'dime', 'muestrame', 'ver'
]);

const normalizar = (texto) =>
    texto.toLowerCase()
         .normalize('NFD')
         .replace(/[̀-ͯ]/g, '');

// Extrae términos útiles del mensaje y busca cada uno en BD.
// Devuelve hasta 5 productos únicos encontrados.
exports.buscarProductos = async (mensaje) => {
    const palabras = normalizar(mensaje)
        .replace(/[^a-z0-9ñ\s]/g, ' ')
        .split(/\s+/)
        .filter(p => p.length >= 3 && !STOP_WORDS.has(p));

    if (!palabras.length) return [];

    const encontrados = new Map();
    for (const palabra of palabras.slice(0, 4)) { // máx 4 términos por mensaje
        const productos = await iaModel.searchProducts(palabra);
        for (const p of productos) {
            if (!encontrados.has(p.id)) encontrados.set(p.id, p);
        }
        if (encontrados.size >= 5) break;
    }

    return [...encontrados.values()].slice(0, 5);
};
