// ─────────────────────────────────────────────────────────────
//  dashboard.routes.js — atiende al panel web Y a la app móvil.
// ─────────────────────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/dashboard.controller');
const { verificarToken, verificarRol, verificarCargo } = require('../middlewares/auth.middleware');

const esColab = [verificarToken, verificarRol('COLABORADOR')];
// "Gráficos" (ventas por mes, productos más vendidos, top clientes,
// stock analítico) — información de negocio, no operativa del día a
// día. Solo Administrador y Gerente. El resumen básico del inicio
// (/api/dashboard) y Pedidos siguen abiertos a cualquier colaborador.
const graficos = [verificarToken, verificarRol('COLABORADOR'), verificarCargo('Administrador', 'Gerente')];

router.get('/api/dashboard',                    ...esColab, ctrl.getDashboardData);
router.get('/api/dashboard/ventas-mes',         ...graficos, ctrl.getVentasPorMes);
router.get('/api/dashboard/productos-vendidos', ...graficos, ctrl.getProductosMasVendidos);
router.get('/api/dashboard/top-clientes',       ...graficos, ctrl.getTopClientes);
router.get('/api/dashboard/stock',              ...graficos, ctrl.getStockProductos);
router.get('/api/pedidos',                      ...esColab, ctrl.getPedidos);
router.put('/api/pedidos/:id/estado',           ...esColab, ctrl.actualizarEstadoPedido);
router.get('/api/pedidos/:id',                  ...esColab, ctrl.getDetallePedido);

module.exports = router;
