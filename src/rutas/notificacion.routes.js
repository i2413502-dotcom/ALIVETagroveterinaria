const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/notificacion.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Público a propósito: un visitante puede aceptar el permiso de
// notificaciones push antes de iniciar sesión (ver public/js/notificaciones.js).
router.post('/registrar-token', ctrl.registrarToken);

// Se utiliza para el móvil
router.get('/',           verificarToken, ctrl.listar);
// Se utiliza para el móvil
router.put('/:id/leer',   verificarToken, ctrl.marcarLeida);

module.exports = router;
