// ─────────────────────────────────────────────────────────────
//  inventario.routes.js — atiende al panel web Y a la app móvil.
//  "buscar-codigo" es el que llama la pantalla "Escanear" de la
//  app (abierto a CUALQUIER colaborador, incluido Vendedor). Los
//  otros 3 (bajo-stock, por-vencer, actualizar-stock) son gestión
//  de inventario — solo Administrador/Gerente, igual que Nuevo
//  producto/Categorías/Animales.
// ─────────────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const ctrl = require('../controladores/inventario.controller');
const { verificarToken, verificarRol, verificarCargo } = require('../middlewares/auth.middleware');

const esColab = [verificarToken, verificarRol('COLABORADOR')];
const gestionInventario = [verificarToken, verificarRol('COLABORADOR'), verificarCargo('Administrador', 'Gerente')];

// Buscar por código de barras (pantalla "Escanear") — lo usa
// cualquier colaborador para atender ventas, no es información
// administrativa sensible.
router.get('/buscar-codigo/:codigo', ...esColab, ctrl.buscarPorCodigo);

// Stock bajo / próximos a vencer / ajustar stock manualmente —
// gestión de inventario, mismo criterio que crear/editar productos:
// Administrador y Gerente.
router.get('/bajo-stock',           ...gestionInventario, ctrl.bajoPorStock);
router.get('/por-vencer',           ...gestionInventario, ctrl.porVencer);
router.put('/actualizar-stock/:id', ...gestionInventario, ctrl.actualizarStock);

module.exports = router;
