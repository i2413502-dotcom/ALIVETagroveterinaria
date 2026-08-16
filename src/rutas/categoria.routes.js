// ─────────────────────────────────────────────────────────────
//  categoria.routes.js — atiende al panel web Y a la app móvil.
//  Crear/editar/eliminar categorías desde la pantalla "Categorías"
//  de la app (Accesos rápidos) pasa por este mismo bloqueo.
// ─────────────────────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/categoria.controller');
const { verificarToken, verificarRol, verificarCargo } = require('../middlewares/auth.middleware');

const gestionInventario = [verificarToken, verificarRol('COLABORADOR'), verificarCargo('Administrador', 'Gerente')];

router.get('/',                  ctrl.getAll);             // público (catálogo)
router.get('/:id/subcategorias', ctrl.getSubcategorias);    // público (formulario en cascada)

router.post('/',      ...gestionInventario, ctrl.create);
router.put('/:id',    ...gestionInventario, ctrl.update);
router.delete('/:id', ...gestionInventario, ctrl.delete);

router.post('/subcategorias',       ...gestionInventario, ctrl.createSubcategoria);
router.put('/subcategorias/:id',    ...gestionInventario, ctrl.updateSubcategoria);
router.delete('/subcategorias/:id', ...gestionInventario, ctrl.deleteSubcategoria);

module.exports = router;
