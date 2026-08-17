const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/colaborador.controller');
const { verificarToken, verificarRol, verificarCargo } = require('../middlewares/auth.middleware');

router.use(verificarToken, verificarRol('COLABORADOR'), verificarCargo('Administrador'));

router.get('/',                   ctrl.getAll);
router.get('/cargos',             ctrl.getCargos);
router.post('/',                  ctrl.create);
// Se utiliza para el móvil
router.post('/solicitar-creacion', ctrl.solicitarCreacion);
// Se utiliza para el móvil
router.post('/confirmar-creacion', ctrl.confirmarCreacion);
router.put('/:id',                ctrl.update);
router.put('/:id/reset-password', ctrl.resetPassword);
router.delete('/:id',             ctrl.eliminar);

module.exports = router;
