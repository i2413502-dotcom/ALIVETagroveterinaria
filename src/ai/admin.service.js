// Capa 3 (Admin): consultas de SOLO LECTURA para el asistente del panel.
// Este servicio NUNCA ejecuta INSERT/UPDATE/DELETE — solo expone stats.
const iaModel = require('../models/ia.model');

exports.obtenerStats = async () => {
    return iaModel.getAdminStats();
};

// Formatea las stats como texto plano para inyectar en el prompt de la IA
exports.statsComoTexto = (stats) => {
    const lineas = [
        `Total de clientes registrados: ${stats.totalClientes}`,
        `Pedidos pendientes: ${stats.pedidosPendientes}`,
        `Pedidos entregados: ${stats.pedidosEntregados}`,
        `Productos activos en catálogo: ${stats.productosActivos}`,
        `Productos con stock bajo: ${stats.productosStockBajo}`,
        `Ventas totales acumuladas: S/ ${Number(stats.ventasTotales).toFixed(2)}`
    ];

    if (stats.topVendidos.length) {
        lineas.push('Top productos más vendidos:');
        stats.topVendidos.forEach((p, i) =>
            lineas.push(`  ${i + 1}. ${p.nombre} (${p.total_vendido} unidades)`));
    }

    if (stats.detalleStockBajo.length) {
        lineas.push('Productos con stock bajo:');
        stats.detalleStockBajo.forEach(p =>
            lineas.push(`  - ${p.nombre}: ${p.stock_actual} unid. (mínimo ${p.stock_minimo})`));
    }

    if (stats.proximosAVencer.length) {
        lineas.push('Productos próximos a vencer (30 días):');
        stats.proximosAVencer.forEach(p =>
            lineas.push(`  - ${p.nombre}: vence ${p.vence}`));
    }

    return lineas.join('\n');
};
