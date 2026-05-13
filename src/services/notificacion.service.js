const admin = require('../config/firebase');
const db = require('../config/db');

async function enviarNotificacion(titulo, cuerpo, data = {}) {
    try {
        const [tokens] = await db.query(
            'SELECT token FROM fcm_tokens WHERE activo = 1'
        );

        if (!tokens.length) {
            console.log('Sin tokens registrados, guardando en BD...');
            await guardarEnBD(titulo, cuerpo, data);
            return;
        }

        // Convertir todos los valores de data a string (requisito de FCM)
        const dataStr = {};
        for (const [k, v] of Object.entries(data)) {
            dataStr[k] = String(v);
        }

        const mensaje = {
            notification: { title: titulo, body: cuerpo },
            data: dataStr,
            // Configuración para que llegue a celulares con Chrome antiguo
            webpush: {
                headers: { Urgency: 'high' },
                notification: {
                    title: titulo,
                    body: cuerpo,
                    icon: '/img/logo.jpeg',
                    badge: '/img/logo.jpeg',
                    vibrate: [200, 100, 200], // vibración en celulares
                    requireInteraction: true   // no desaparece sola
                },
                fcm_options: { link: '/dashboard.html' }
            },
            tokens: tokens.map(t => t.token)
        };

        const response = await admin.messaging().sendEachForMulticast(mensaje);
        console.log(`Notificaciones: ${response.successCount} ok, ${response.failureCount} fallidas`);

        // Desactivar tokens inválidos automáticamente
        for (let i = 0; i < response.responses.length; i++) {
            const r = response.responses[i];
            if (!r.success) {
                const code = r.error?.code;
                if (code === 'messaging/invalid-registration-token' ||
                    code === 'messaging/registration-token-not-registered') {
                    await db.query(
                        'UPDATE fcm_tokens SET activo = 0 WHERE token = ?',
                        [tokens[i].token]
                    );
                }
            }
        }

        // Guardar siempre en BD para el historial del dashboard
        await guardarEnBD(titulo, cuerpo, data);

    } catch (err) {
        console.error('Error al enviar notificación:', err.message);
        // Aunque falle FCM, guardar en BD
        await guardarEnBD(titulo, cuerpo, data);
    }
}

async function guardarEnBD(titulo, cuerpo, data) {
    try {
        await db.query(
            'INSERT INTO notificaciones (titulo, cuerpo, tipo, leida) VALUES (?, ?, ?, 0)',
            [titulo, cuerpo, data.tipo || 'general']
        );
    } catch (err) {
        console.error('Error guardando notificación en BD:', err.message);
    }
}

module.exports = { enviarNotificacion };