// Se utiliza para el móvil
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/dashboard.controller');
const upload  = require('../config/upload');
const { verificarToken, verificarRol, verificarCargo } = require('../middlewares/auth.middleware');

const esColab = [verificarToken, verificarRol('COLABORADOR')];
// Se utiliza para el móvil
const graficos = [verificarToken, verificarRol('COLABORADOR'), verificarCargo('Administrador', 'Gerente')];

router.get('/api/dashboard',                    ...esColab, ctrl.getDashboardData);
router.get('/api/dashboard/ventas-mes',         ...graficos, ctrl.getVentasPorMes);
router.get('/api/dashboard/productos-vendidos', ...graficos, ctrl.getProductosMasVendidos);
router.get('/api/dashboard/top-clientes',       ...graficos, ctrl.getTopClientes);
router.get('/api/dashboard/stock',              ...graficos, ctrl.getStockProductos);
router.get('/api/pedidos',                      ...esColab, ctrl.getPedidos);
router.put('/api/pedidos/:id/estado',           ...esColab, ctrl.actualizarEstadoPedido);
router.get('/api/pedidos/:id',                  ...esColab, ctrl.getDetallePedido);

// "Evidencia" — acceso rápido del móvil (cualquier colaborador, no solo
// Administrador/Gerente: lo usa el repartidor en la calle). Antes de
// /:id para que "buscar-codigo" no se confunda con un id numérico.
router.get('/api/pedidos/buscar-codigo/:codigo', ...esColab, ctrl.buscarPedidoPorCodigo);
router.put('/api/pedidos/:id/evidencia-cancelacion',
    ...esColab, upload.single('imagen'), ctrl.subirEvidenciaCancelacion);

module.exports = router;
