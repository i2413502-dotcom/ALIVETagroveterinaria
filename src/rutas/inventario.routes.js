// Se utiliza para el móvil
const express = require('express');
const router = express.Router();
const ctrl = require('../controladores/inventario.controller');
const { verificarToken, verificarRol, verificarCargo } = require('../middlewares/auth.middleware');

const esColab = [verificarToken, verificarRol('COLABORADOR')];
const gestionInventario = [verificarToken, verificarRol('COLABORADOR'), verificarCargo('Administrador', 'Gerente')];

// Se utiliza para el móvil
router.get('/buscar-codigo/:codigo', ...esColab, ctrl.buscarPorCodigo);

// Se utiliza para el móvil
router.get('/bajo-stock',           ...gestionInventario, ctrl.bajoPorStock);
router.get('/por-vencer',           ...gestionInventario, ctrl.porVencer);
router.put('/actualizar-stock/:id', ...gestionInventario, ctrl.actualizarStock);

module.exports = router;
