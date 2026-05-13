const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/pedido.controller');

router.post('/crear',          ctrl.crearPedido);
router.get('/mispedidos',      ctrl.obtenerPedidos);
router.get('/mispedidos/:id',  ctrl.obtenerDetallePedido);

module.exports = router;