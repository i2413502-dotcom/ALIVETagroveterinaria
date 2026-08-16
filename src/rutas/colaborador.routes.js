const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/colaborador.controller');
const { verificarToken, verificarRol, verificarCargo } = require('../middlewares/auth.middleware');

// Este archivo lo consume tanto el panel web como la app móvil
// (pantalla "Colaboradores" del dashboard Flutter). Gestión de
// colaboradores: exclusivo del Administrador (no cualquier
// colaborador). Los demás cargos (Gerente/Vendedor/Asistente de
// ventas) no ven ni tocan esta sección — solo Accesos rápidos.
// La app móvil además OCULTA la tarjeta "Colaboradores" si el
// cargo no es Administrador, pero este bloqueo de acá es el que
// de verdad protege, aunque alguien intente llamar a la API
// directamente sin pasar por la app.
router.use(verificarToken, verificarRol('COLABORADOR'), verificarCargo('Administrador'));

router.get('/',                   ctrl.getAll);
router.get('/cargos',             ctrl.getCargos);
router.post('/',                  ctrl.create);
router.put('/:id',                ctrl.update);
router.put('/:id/reset-password', ctrl.resetPassword);
router.delete('/:id',             ctrl.eliminar);

module.exports = router;
