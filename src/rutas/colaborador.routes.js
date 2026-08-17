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
router.put('/:id/reset-password', ctrl.resetPassword);
router.delete('/:id',             ctrl.eliminar);

module.exports = router;
