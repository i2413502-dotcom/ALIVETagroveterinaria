// ─────────────────────────────────────────────────────────────
//  producto.routes.js — este mismo backend atiende tanto al
//  panel web (public/*.html) COMO a la app móvil Flutter
//  (Proyecto Movil MR1 / ALEVET). Las restricciones de acá abajo
//  (verificarCargo) aplican para las DOS: si un Vendedor intenta
//  crear/editar/eliminar un producto desde la app móvil, este
//  mismo bloqueo lo frena, sin importar si la app oculta o no
//  el botón "Nuevo producto" en el dashboard.
// ─────────────────────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/producto.controller');
const { verificarToken, verificarRol, verificarCargo } = require('../middlewares/auth.middleware');

const gestionInventario = [verificarToken, verificarRol('COLABORADOR'), verificarCargo('Administrador', 'Gerente')];

// Públicas — el catálogo lo consume la tienda web sin login
router.get('/buscar-ficha', ctrl.buscarFichaTecnica); // ← ANTES de /:id
router.get('/',             ctrl.listar);
router.get('/:id',          ctrl.obtenerPorId);

// Crear/editar/eliminar productos: Administrador y Gerente. Vendedor
// y Asistente de ventas pueden ver/buscar productos (Escanear), pero
// no dar de alta ni tocar precios/stock del catálogo.
router.post('/',            ...gestionInventario, ctrl.crear);
router.put('/:id/estado',   ...gestionInventario, ctrl.cambiarEstado);
router.put('/:id',          ...gestionInventario, ctrl.actualizar);
router.delete('/:id',       ...gestionInventario, ctrl.eliminar);

module.exports = router;
