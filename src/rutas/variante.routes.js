const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/variante.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Públicas — el catálogo y la ficha de producto las necesitan sin login
router.get('/catalogos',            ctrl.catalogos);
router.get('/producto/:idProducto', ctrl.listarPorProducto);

// Protegidas — solo colaboradores
router.post('/producto/:idProducto', verificarToken, verificarRol('COLABORADOR'), ctrl.crear);
router.put('/:id',                   verificarToken, verificarRol('COLABORADOR'), ctrl.actualizar);
router.delete('/:id',                verificarToken, verificarRol('COLABORADOR'), ctrl.eliminar);

module.exports = router;
