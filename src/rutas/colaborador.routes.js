const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/colaborador.controller');
const { verificarToken, verificarRol, verificarCargo } = require('../middlewares/auth.middleware');

// Todo este módulo es exclusivo del Administrador (según matriz de permisos)
router.use(verificarToken, verificarRol('COLABORADOR'), verificarCargo('Administrador'));

router.get('/',                   ctrl.getAll);
router.get('/cargos',             ctrl.getCargos);
router.post('/',                  ctrl.create);
router.put('/:id',                ctrl.update);
router.put('/:id/reset-password', ctrl.resetPassword);

module.exports = router;
