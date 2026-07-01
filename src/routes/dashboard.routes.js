const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/dashboard.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

const esColab = [verificarToken, verificarRol('COLABORADOR')];

router.get('/api/dashboard',                    ...esColab, ctrl.getDashboardData);
router.get('/api/dashboard/ventas-mes',         ...esColab, ctrl.getVentasPorMes);
router.get('/api/dashboard/productos-vendidos', ...esColab, ctrl.getProductosMasVendidos);
router.get('/api/dashboard/stock',              ...esColab, ctrl.getStockProductos);
router.get('/api/pedidos',                      ...esColab, ctrl.getPedidos);
router.put('/api/pedidos/:id/estado',           ...esColab, ctrl.actualizarEstadoPedido);
router.get('/api/pedidos/:id',                  ...esColab, ctrl.getDetallePedido);

module.exports = router;
