const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/notificacion.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Público a propósito: un visitante puede aceptar el permiso de
// notificaciones push antes de iniciar sesión (ver public/js/notificaciones.js).
router.post('/registrar-token', ctrl.registrarToken);

// NOTA: estos dos endpoints no tenían NINGÚN middleware de autenticación
// en app.js, y exponen el historial interno de notificaciones (pedidos,
// alertas de stock, etc.) a cualquiera que conociera la URL. Actualmente
// tampoco los está llamando ninguna página del frontend todavía — quedan
// protegidos y listos para cuando se conecte el panel de notificaciones.
router.get('/',           verificarToken, ctrl.listar);
router.put('/:id/leer',   verificarToken, ctrl.marcarLeida);

module.exports = router;
