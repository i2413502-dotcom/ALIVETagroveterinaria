const db = require('../config/db');

exports.getDashboardData = async () => {
    const [[clientes]]          = await db.query("SELECT COUNT(*) total FROM cliente");
    const [[pedidosPendientes]] = await db.query("SELECT COUNT(*) total FROM pedido WHERE estado='PENDIENTE'");
    const [[pedidosEntregados]] = await db.query("SELECT COUNT(*) total FROM pedido WHERE estado='ENTREGADO'");
    const [[productos]]         = await db.query("SELECT COUNT(*) total FROM producto WHERE estado='ACTIVO'");
    const [[stockBajo]]         = await db.query("SELECT COUNT(*) total FROM producto WHERE stock_actual <= stock_minimo AND estado='ACTIVO'");
    const [[ventasTotal]]       = await db.query("SELECT COALESCE(SUM(total),0) total FROM pedido WHERE estado IN ('PAGADO','ENVIADO','ENTREGADO')");

    return {
        clientes:          clientes.total,
        pedidosPendientes: pedidosPendientes.total,
        pedidosEntregados: pedidosEntregados.total,
        productos:         productos.total,
        stockBajo:         stockBajo.total,
        ventasTotal:       ventasTotal.total
    };
};

// Ventas por mes (últimos 6 meses)
exports.getVentasPorMes = async () => {
    const [rows] = await db.query(`
        SELECT 
            DATE_FORMAT(fecha_pedido, '%Y-%m') AS mes,
            DATE_FORMAT(fecha_pedido, '%b %Y')  AS mes_label,
            COUNT(*)                            AS cantidad_pedidos,
            COALESCE(SUM(total), 0)             AS total_ventas
        FROM pedido
        WHERE estado IN ('PAGADO','ENVIADO','ENTREGADO')
          AND fecha_pedido >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE_FORMAT(fecha_pedido, '%Y-%m'), DATE_FORMAT(fecha_pedido, '%b %Y')
        ORDER BY mes ASC
    `);
    return rows;
};

// Top 5 productos más vendidos
exports.getProductosMasVendidos = async () => {
    const [rows] = await db.query(`
        SELECT 
            p.nombre,
            SUM(dp.cantidad)  AS total_vendido,
            SUM(dp.subtotal)  AS total_ingresos
        FROM detalle_pedido dp
        JOIN producto p      ON dp.id_producto = p.id_producto
        JOIN pedido   pe     ON dp.id_pedido   = pe.id_pedido
        WHERE pe.estado IN ('PAGADO','ENVIADO','ENTREGADO')
        GROUP BY p.id_producto, p.nombre
        ORDER BY total_vendido DESC
        LIMIT 5
    `);
    return rows;
};

// Stock actual 
exports.getStockProductos = async () => {
    const [rows] = await db.query(`
        SELECT nombre, stock_actual, stock_minimo
        FROM producto
        WHERE estado = 'ACTIVO'
        ORDER BY stock_actual ASC
        LIMIT 10
    `);
    return rows;
};

exports.getPedidos = async () => {
    const [rows] = await db.query(`
        SELECT 
            p.id_pedido, p.fecha_pedido, p.total, p.costo_envio,
            p.direccion_entrega, p.estado,
            per.nombres         AS cliente_nombre,
            z.nombre_zona       AS zona,
            tc.nombre           AS tipo_comprobante
        FROM pedido p
        JOIN cliente    c  ON p.id_cliente          = c.id_cliente
        JOIN persona    per ON c.id_persona         = per.id_persona
        LEFT JOIN zona_envio       z  ON p.id_zona             = z.id_zona
        LEFT JOIN tipo_comprobante tc ON p.id_tipo_comprobante = tc.id_tipo_comprobante
        ORDER BY p.fecha_pedido DESC
    `);
    return rows;
};

exports.actualizarEstadoPedido = async (id, estado) => {
    await db.query("UPDATE pedido SET estado=? WHERE id_pedido=?", [estado, id]);
};