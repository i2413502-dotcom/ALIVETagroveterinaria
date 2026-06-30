const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/pedido.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Requieren estar logueado (el cliente solo ve/crea SUS propios pedidos)
router.post('/crear',          verificarToken, ctrl.crearPedido);
router.get('/mispedidos',      verificarToken, ctrl.obtenerPedidos);
router.get('/mispedidos/:id',  verificarToken, ctrl.obtenerDetallePedido);

module.exports = router;
