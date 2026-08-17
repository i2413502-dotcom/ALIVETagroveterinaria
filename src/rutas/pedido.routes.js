const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/pedido.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Requieren estar logueado (el cliente solo ve/crea SUS propios pedidos)
// Se utiliza para el móvil
router.post('/crear',          verificarToken, ctrl.crearPedido);
// Se utiliza para el móvil
router.get('/mispedidos',      verificarToken, ctrl.obtenerPedidos);
router.get('/mispedidos/:id',  verificarToken, ctrl.obtenerDetallePedido);

module.exports = router;
