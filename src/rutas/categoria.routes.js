const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/categoria.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

router.get('/',                  ctrl.getAll);             // público (catálogo)
router.get('/:id/subcategorias', ctrl.getSubcategorias);    // público (formulario en cascada)

router.post('/',      verificarToken, verificarRol('COLABORADOR'), ctrl.create);
router.put('/:id',    verificarToken, verificarRol('COLABORADOR'), ctrl.update);
router.delete('/:id', verificarToken, verificarRol('COLABORADOR'), ctrl.delete);

router.post('/subcategorias',       verificarToken, verificarRol('COLABORADOR'), ctrl.createSubcategoria);
router.put('/subcategorias/:id',    verificarToken, verificarRol('COLABORADOR'), ctrl.updateSubcategoria);
router.delete('/subcategorias/:id', verificarToken, verificarRol('COLABORADOR'), ctrl.deleteSubcategoria);

module.exports = router;
