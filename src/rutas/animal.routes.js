const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/animal.controller');
const { verificarToken, verificarRol, verificarCargo } = require('../middlewares/auth.middleware');

router.get('/',       ctrl.getAll);  // público (catálogo)

router.post('/',      verificarToken, verificarRol('COLABORADOR'), verificarCargo('Administrador', 'Gerente'), ctrl.create);
router.put('/:id',    verificarToken, verificarRol('COLABORADOR'), verificarCargo('Administrador', 'Gerente'), ctrl.update);
router.delete('/:id', verificarToken, verificarRol('COLABORADOR'), verificarCargo('Administrador', 'Gerente'), ctrl.delete);

module.exports = router;
