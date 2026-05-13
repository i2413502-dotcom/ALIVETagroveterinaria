const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/dashboard.controller');

router.get('/api/dashboard',                   ctrl.getDashboardData);
router.get('/api/dashboard/ventas-mes',        ctrl.getVentasPorMes);
router.get('/api/dashboard/productos-vendidos',ctrl.getProductosMasVendidos);
router.get('/api/dashboard/stock',             ctrl.getStockProductos);
router.get('/api/pedidos',                     ctrl.getPedidos);
router.put('/api/pedidos/:id/estado',          ctrl.actualizarEstadoPedido);
router.get('/api/pedidos/:id', ctrl.getDetallePedido);

module.exports = router;