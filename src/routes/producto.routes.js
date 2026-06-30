const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/producto.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Públicas — el catálogo lo consume la tienda web sin login
router.get('/buscar-ficha', ctrl.buscarFichaTecnica); // ← ANTES de /:id
router.get('/',             ctrl.listar);
router.get('/:id',          ctrl.obtenerPorId);

// Protegidas — solo colaboradores
router.post('/',            verificarToken, verificarRol('COLABORADOR'), ctrl.crear);
router.put('/:id/estado',   verificarToken, verificarRol('COLABORADOR'), ctrl.cambiarEstado);
router.put('/:id',          verificarToken, verificarRol('COLABORADOR'), ctrl.actualizar);
router.delete('/:id',       verificarToken, verificarRol('COLABORADOR'), ctrl.eliminar);

module.exports = router;
