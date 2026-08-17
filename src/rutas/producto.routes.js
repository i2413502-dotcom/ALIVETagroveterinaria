// Se utiliza para el móvil
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/producto.controller');
const { verificarToken, verificarRol, verificarCargo } = require('../middlewares/auth.middleware');

const gestionInventario = [verificarToken, verificarRol('COLABORADOR'), verificarCargo('Administrador', 'Gerente')];

// Públicas — el catálogo lo consume la tienda web sin login
router.get('/buscar-ficha', ctrl.buscarFichaTecnica); // ← ANTES de /:id
// Se utiliza para el móvil
router.get('/',             ctrl.listar);
// Se utiliza para el móvil
router.get('/:id',          ctrl.obtenerPorId);

// Se utiliza para el móvil
router.post('/',            ...gestionInventario, ctrl.crear);
router.put('/:id/estado',   ...gestionInventario, ctrl.cambiarEstado);
router.put('/:id',          ...gestionInventario, ctrl.actualizar);
router.delete('/:id',       ...gestionInventario, ctrl.eliminar);

module.exports = router;
