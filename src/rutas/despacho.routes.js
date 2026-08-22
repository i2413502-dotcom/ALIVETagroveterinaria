const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/despacho.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Igual que Ventas: exclusivo del panel de administrador/colaborador.
router.use(verificarToken, verificarRol('COLABORADOR'));

router.get('/',                       ctrl.listar);
router.get('/colaboradores',          ctrl.listarColaboradores);
router.put('/:idPedido/repartidor',   ctrl.asignarRepartidor);

module.exports = router;
