const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/producto.controller');
const { verificarToken, verificarRol, verificarCargo } = require('../middlewares/auth.middleware');

// Públicas — el catálogo lo consume la tienda web sin login
router.get('/buscar-ficha', ctrl.buscarFichaTecnica); // ← ANTES de /:id
router.get('/meta/animales-disponibles', ctrl.tiposAnimalConProductos); // ← ANTES de /:id
router.get('/',             ctrl.listar);
router.get('/:id',          ctrl.obtenerPorId);

// Protegidas — solo colaboradores
router.get('/:id/admin',    verificarToken, verificarRol('COLABORADOR'), ctrl.obtenerParaAdmin);
router.post('/',            verificarToken, verificarRol('COLABORADOR'), verificarCargo('Administrador', 'Gerente'), ctrl.crear);
router.put('/:id/estado',   verificarToken, verificarRol('COLABORADOR'), ctrl.cambiarEstado);
router.put('/:id',          verificarToken, verificarRol('COLABORADOR'), ctrl.actualizar);
router.delete('/:id',       verificarToken, verificarRol('COLABORADOR'), ctrl.eliminar);

module.exports = router;
