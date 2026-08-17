const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/reporte.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Todo este módulo es exclusivo del panel de administrador
router.use(verificarToken, verificarRol('COLABORADOR'));

// KPIs / gráficos / tabla
router.get('/resumen',              ctrl.resumen);
router.get('/ventas-por-categoria', ctrl.ventasPorCategoria);
router.get('/productos-stock-bajo', ctrl.productosStockBajo);

// Exportaciones
router.get('/exportar/ventas-pdf',      ctrl.exportarVentasPDF);
router.get('/exportar/ventas-excel',    ctrl.exportarVentasExcel);     // Excel con estilos
router.get('/exportar/productos-excel', ctrl.exportarProductosExcel);  // Inventario
router.get('/exportar/ventas-powerbi',  ctrl.exportarVentasPowerBI);   // Excel crudo (Power BI)

// Se utiliza para el móvil
router.get('/exportar/:entidad/:formato', ctrl.exportarEntidad);

module.exports = router;
