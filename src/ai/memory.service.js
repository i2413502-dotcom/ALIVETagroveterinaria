// Memoria contextual estructurada: extrae datos útiles del mensaje
// (mascotas, categorías de interés) y los persiste en user_ai_context.
// NO guarda conversaciones completas — solo entidades.
const iaModel = require('../models/ia.model');

// Tipos de animal que reconocemos en el texto del usuario
const TIPOS_MASCOTA = [
    'perro', 'perra', 'cachorro', 'gato', 'gata', 'gatito',
    'vaca', 'toro', 'caballo', 'yegua', 'cerdo', 'chancho',
    'gallina', 'pollo', 'gallo', 'conejo', 'oveja', 'cabra',
    'cuy', 'pato', 'hamster', 'loro', 'ave', 'pez', 'tortuga'
];

// Normaliza tipo a su forma canónica (perra/cachorro -> perro, etc.)
const CANONICO = {
    perra: 'perro', cachorro: 'perro', gata: 'gato', gatito: 'gato',
    toro: 'vaca', yegua: 'caballo', chancho: 'cerdo',
    pollo: 'gallina', gallo: 'gallina'
};

const normalizar = (texto) =>
    texto.toLowerCase()
         .normalize('NFD')
         .replace(/[̀-ͯ]/g, '');

// Detecta menciones tipo "tengo un perro pastor alemán" y captura
// hasta 3 palabras después del tipo como posible raza.
const extraerMascotas = (mensaje) => {
    const msg = normalizar(mensaje);
    const mascotas = [];

    for (const tipo of TIPOS_MASCOTA) {
        const regex = new RegExp(
            `(?:tengo|mi|una?|adopte|compre)\\s+(?:una?\\s+)?${tipo}(?:\\s+(?:de\\s+raza\\s+|raza\\s+)?([a-zñ]+(?:\\s+[a-zñ]+){0,2}))?`,
            'i'
        );
        const match = msg.match(regex);
        if (match) {
            const tipoCanonico = CANONICO[tipo] || tipo;
            const mascota = { tipo: tipoCanonico };

            // La palabra capturada solo es raza si no es otra palabra común
            const NO_RAZA = ['que', 'y', 'pero', 'para', 'con', 'muy', 'en', 'de', 'el', 'la', 'esta', 'este'];
            if (match[1] && !NO_RAZA.includes(match[1].split(' ')[0])) {
                mascota.raza = match[1].trim();
            }
            mascotas.push(mascota);
        }
    }
    return mascotas;
};

// Lee el contexto actual del usuario (null si no existe aún)
exports.obtenerContexto = async (userId) => {
    try {
        return await iaModel.getContext(userId);
    } catch (err) {
        console.error('Error leyendo memoria de usuario:', err.message);
        return null;
    }
};

// Actualiza la memoria con lo extraído del mensaje + categorías de los
// productos que el usuario consultó. Fusiona sin duplicar.
exports.actualizarMemoria = async (userId, mensaje, productosConsultados = []) => {
    try {
        const actual = (await iaModel.getContext(userId)) || { mascotas: [], categorias_favoritas: [] };

        // Fusionar mascotas nuevas (clave: tipo+raza)
        const nuevas = extraerMascotas(mensaje);
        for (const nueva of nuevas) {
            const existe = actual.mascotas.some(m =>
                m.tipo === nueva.tipo && (m.raza || '') === (nueva.raza || '')
            );
            if (!existe) {
                // Si ya existía el tipo sin raza y ahora llega con raza, se enriquece
                const sinRaza = actual.mascotas.find(m => m.tipo === nueva.tipo && !m.raza);
                if (sinRaza && nueva.raza) sinRaza.raza = nueva.raza;
                else actual.mascotas.push(nueva);
            }
        }

        // Acumular categorías de productos consultados (máx 10)
        for (const p of productosConsultados) {
            if (p.categoria && !actual.categorias_favoritas.includes(p.categoria)) {
                actual.categorias_favoritas.push(p.categoria);
            }
        }
        actual.categorias_favoritas = actual.categorias_favoritas.slice(-10);
        actual.mascotas = actual.mascotas.slice(-10);

        await iaModel.saveContext(userId, actual);
        return actual;
    } catch (err) {
        console.error('Error guardando memoria de usuario:', err.message);
        return null;
    }
};
