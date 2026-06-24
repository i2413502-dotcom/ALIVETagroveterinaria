const jwt = require('jsonwebtoken');
const iaService = require('../ai/ia.service');

// Extrae el usuario del JWT si viene en el header. Token inválido o
// ausente = INVITADO (no es error: la capa 1 atiende sin sesión).
const extraerUsuario = (req) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return { userId: null, rol: 'INVITADO' };

    try {
        const payload = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
        return { userId: payload.id, rol: payload.rol || 'CLIENTE' };
    } catch (err) {
        return { userId: null, rol: 'INVITADO' };
    }
};

// POST /api/ia/chat — { mensaje, faqId?, paginaActual? }
exports.chat = async (req, res) => {
    try {
        const { mensaje, faqId, paginaActual } = req.body;

        if (!faqId && (!mensaje || !mensaje.trim())) {
            return res.status(400).json({ mensaje: 'El mensaje no puede estar vacío' });
        }
        if (mensaje && mensaje.length > 500) {
            return res.status(400).json({ mensaje: 'El mensaje es demasiado largo (máx. 500 caracteres)' });
        }

        const { userId, rol } = extraerUsuario(req);
        const resultado = await iaService.procesarMensaje({
            userId,
            rol,
            mensaje: (mensaje || '').trim(),
            faqId,
            paginaActual: typeof paginaActual === 'string' ? paginaActual.slice(0, 200) : ''
        });

        res.json({
            respuesta: resultado.respuesta,
            rol,
            productos: resultado.productos || []
        });
    } catch (err) {
        console.error('Error en chat IA:', err);
        res.status(500).json({ mensaje: 'Error procesando tu mensaje' });
    }
};

// GET /api/ia/history — historial del usuario logueado (últimos 2 días)
exports.history = async (req, res) => {
    try {
        const { userId } = extraerUsuario(req);
        if (!userId) return res.json([]); // invitados no tienen historial

        const historial = await iaService.obtenerHistorial(userId);
        res.json(historial);
    } catch (err) {
        console.error('Error obteniendo historial IA:', err);
        res.status(500).json({ mensaje: 'Error al obtener historial' });
    }
};

// GET /api/ia/faqs — preguntas frecuentes para los chips del widget
exports.faqs = (req, res) => {
    res.json(iaService.listarFaqs());
};
