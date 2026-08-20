const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/categoria.controller');
const { verificarToken, verificarRol, verificarCargo } = require('../middlewares/auth.middleware');

router.get('/',                  ctrl.getAll);             // público (catálogo)
router.get('/:id/subcategorias', ctrl.getSubcategorias);    // público (formulario en cascada)
router.get('/:id/subcategorias/admin', verificarToken, verificarRol('COLABORADOR'), ctrl.getSubcategoriasAdmin);

router.post('/',      verificarToken, verificarRol('COLABORADOR'), verificarCargo('Administrador', 'Gerente'), ctrl.create);
router.put('/:id',    verificarToken, verificarRol('COLABORADOR'), verificarCargo('Administrador', 'Gerente'), ctrl.update);
router.delete('/:id', verificarToken, verificarRol('COLABORADOR'), verificarCargo('Administrador', 'Gerente'), ctrl.delete);

router.post('/subcategorias',       verificarToken, verificarRol('COLABORADOR'), verificarCargo('Administrador', 'Gerente'), ctrl.createSubcategoria);
router.put('/subcategorias/:id',    verificarToken, verificarRol('COLABORADOR'), verificarCargo('Administrador', 'Gerente'), ctrl.updateSubcategoria);
router.delete('/subcategorias/:id', verificarToken, verificarRol('COLABORADOR'), verificarCargo('Administrador', 'Gerente'), ctrl.deleteSubcategoria);

module.exports = router;
