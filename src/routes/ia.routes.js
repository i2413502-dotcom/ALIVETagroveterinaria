const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const iaController = require('../controllers/ia.controller');

// ── Rate limit anti-spam: 12 peticiones por minuto por usuario/IP ──
// Implementación en memoria (sin dependencias). La clave es el id del
// usuario si hay JWT válido; si no, la IP.
const VENTANA_MS = 60 * 1000;
const MAX_PETICIONES = 12;
const peticiones = new Map(); // clave -> [timestamps]

const claveDe = (req) => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
        try {
            const payload = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
            return `user:${payload.id}`;
        } catch (e) { /* token inválido: cae a IP */ }
    }
    return `ip:${req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip}`;
};

const rateLimit = (req, res, next) => {
    const ahora = Date.now();
    const clave = claveDe(req);

    const historial = (peticiones.get(clave) || []).filter(t => ahora - t < VENTANA_MS);
    if (historial.length >= MAX_PETICIONES) {
        return res.status(429).json({
            mensaje: 'Has enviado demasiados mensajes. Espera un momento e intenta de nuevo. ⏳'
        });
    }
    historial.push(ahora);
    peticiones.set(clave, historial);
    next();
};

// Limpieza periódica del mapa para que no crezca indefinidamente
setInterval(() => {
    const ahora = Date.now();
    for (const [clave, tiempos] of peticiones) {
        const vivos = tiempos.filter(t => ahora - t < VENTANA_MS);
        if (vivos.length) peticiones.set(clave, vivos);
        else peticiones.delete(clave);
    }
}, 5 * 60 * 1000).unref();

// ── Rutas ─────────────────────────────────────────────────────────
router.post('/chat', rateLimit, iaController.chat);
router.get('/history', iaController.history);
router.get('/faqs', iaController.faqs);

module.exports = router;
