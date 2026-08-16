// ─────────────────────────────────────────────────────────────
//  animal.routes.js — atiende al panel web Y a la app móvil.
//  Pantalla "Animales" (Accesos rápidos, solo Administrador/
//  Gerente) usa exactamente estos mismos endpoints.
// ─────────────────────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/animal.controller');
const { verificarToken, verificarRol, verificarCargo } = require('../middlewares/auth.middleware');

const gestionInventario = [verificarToken, verificarRol('COLABORADOR'), verificarCargo('Administrador', 'Gerente')];

router.get('/',       ctrl.getAll);  // público (catálogo)

router.post('/',      ...gestionInventario, ctrl.create);
router.put('/:id',    ...gestionInventario, ctrl.update);
router.delete('/:id', ...gestionInventario, ctrl.delete);

module.exports = router;
