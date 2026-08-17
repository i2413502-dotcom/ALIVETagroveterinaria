const db = require('../config/db');
const responder = require('../utils/responder');

// Registra (o reactiva) un token de Firebase Cloud Messaging para
// poder enviarle notificaciones push a este dispositivo.
async function registrarToken(req, res) {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ mensaje: 'Token requerido' });

        await db.query(
            `INSERT INTO fcm_tokens (token, activo) VALUES (?, 1)
             ON DUPLICATE KEY UPDATE activo = 1, actualizado_at = NOW()`,
            [token]
        );
        res.json({ mensaje: 'Token registrado correctamente' });
    } catch (err) {
        responder.error(res, 500, 'Error al registrar token', err, 'Error registrando token:');
    }
}

// Historial de notificaciones para el panel admin (últimas 50).
async function listar(req, res) {
    try {
        const [rows] = await db.query(
            'SELECT * FROM notificaciones ORDER BY creado_at DESC LIMIT 50'
        );
        res.json(rows);
    } catch (err) {
        responder.error(res, 500, 'Error al obtener notificaciones', err, 'Error obteniendo notificaciones:');
    }
}

// Marca una notificación puntual como leída.
async function marcarLeida(req, res) {
    try {
        await db.query(
            'UPDATE notificaciones SET leida = 1 WHERE id = ?',
            [req.params.id]
        );
        res.json({ mensaje: 'Marcada como leída' });
    } catch (err) {
        responder.error(res, 500, 'Error', err, 'Error marcando notificación:');
    }
}

module.exports = { registrarToken, listar, marcarLeida };
