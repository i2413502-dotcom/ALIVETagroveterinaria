const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/colaborador.controller');
const { verificarToken, verificarRol, verificarCargo } = require('../middlewares/auth.middleware');

// Todo este módulo es exclusivo del Administrador (según matriz de permisos)
router.use(verificarToken, verificarRol('COLABORADOR'), verificarCargo('Administrador'));

router.get('/',                   ctrl.getAll);
router.get('/cargos',             ctrl.getCargos);
router.post('/solicitar-creacion', ctrl.solicitarCreacion);
router.post('/confirmar-creacion', ctrl.confirmarCreacion);
router.post('/',                  ctrl.create);
router.put('/:id',                ctrl.update);
// Flujo con OTP (contraseña actual -> código al correo -> confirmar).
// Reemplaza al viejo reset directo; se mantienen ambos endpoints nuevos
// separados en dos pasos, igual que "Mi perfil".
router.put('/:id/solicitar-reset-password', ctrl.solicitarResetPassword);
router.put('/:id/confirmar-reset-password', ctrl.confirmarResetPassword);
router.delete('/:id',             ctrl.eliminar);

module.exports = router;
