const db = require('../config/db');

// Estados que cuentan como venta efectiva
const ESTADOS_VENTA = "('PAGADO','ENVIADO','ENTREGADO')";

// ── KPIs del panel de reportes ──
exports.getResumen = async () => {
    const [[ventasHoy]] = await db.query(
        `SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS pedidos
         FROM pedido WHERE estado IN ${ESTADOS_VENTA} AND DATE(fecha_pedido)=CURDATE()`);
    const [[ventasMes]] = await db.query(
        `SELECT COALESCE(SUM(total),0) AS total, COUNT(*) AS pedidos
         FROM pedido WHERE estado IN ${ESTADOS_VENTA}
           AND YEAR(fecha_pedido)=YEAR(CURDATE()) AND MONTH(fecha_pedido)=MONTH(CURDATE())`);
    const [[ingresos]] = await db.query(
        `SELECT COALESCE(SUM(total),0) AS total FROM pedido WHERE estado IN ${ESTADOS_VENTA}`);
    const [[productosActivos]] = await db.query(
        "SELECT COUNT(*) AS total FROM producto WHERE estado='ACTIVO'");
    const [[alertasStock]] = await db.query(
        "SELECT COUNT(*) AS total FROM producto WHERE estado='ACTIVO' AND stock_actual <= stock_minimo");
    const [[clientesNuevos]] = await db.query(
        `SELECT COUNT(*) AS total FROM cliente
         WHERE YEAR(fecha_registro)=YEAR(CURDATE()) AND MONTH(fecha_registro)=MONTH(CURDATE())`);
    const [topRows] = await db.query(
        `SELECT p.nombre, SUM(dp.cantidad) AS unidades
         FROM detalle_pedido dp
         JOIN producto p ON dp.id_producto=p.id_producto
         JOIN pedido pe  ON dp.id_pedido=pe.id_pedido
         WHERE pe.estado IN ${ESTADOS_VENTA}
         GROUP BY p.id_producto, p.nombre ORDER BY unidades DESC LIMIT 1`);

    return {
        ventasHoy:           Number(ventasHoy.total),
        pedidosHoy:          ventasHoy.pedidos,
        ventasMes:           Number(ventasMes.total),
        pedidosMes:          ventasMes.pedidos,
        ingresosTotales:     Number(ingresos.total),
        productosActivos:    productosActivos.total,
        alertasStock:        alertasStock.total,
        clientesNuevos:      clientesNuevos.total,
        productoTop:         topRows[0] ? topRows[0].nombre : '—',
        productoTopUnidades: topRows[0] ? Number(topRows[0].unidades) : 0
    };
};

// ── Ventas agrupadas por categoría (gráfico) ──
exports.getVentasPorCategoria = async () => {
    const [rows] = await db.query(`
        SELECT COALESCE(c.nombre,'Sin categoría') AS categoria,
               COALESCE(SUM(dp.subtotal),0)       AS total,
               COALESCE(SUM(dp.cantidad),0)       AS unidades
        FROM detalle_pedido dp
        JOIN producto p ON dp.id_producto=p.id_producto
        JOIN pedido pe  ON dp.id_pedido=pe.id_pedido
        LEFT JOIN categoria_producto c ON p.id_categoria=c.id_categoria
        WHERE pe.estado IN ${ESTADOS_VENTA}
        GROUP BY c.id_categoria, c.nombre
        ORDER BY total DESC`);
    return rows;
};

// ── Productos con stock bajo (tabla de alertas) ──
exports.getProductosStockBajo = async () => {
    const [rows] = await db.query(`
        SELECT p.id_producto, p.nombre, COALESCE(c.nombre,'-') AS categoria,
               p.stock_actual, p.stock_minimo, p.precio_venta
        FROM producto p
        LEFT JOIN categoria_producto c ON p.id_categoria=c.id_categoria
        WHERE p.estado='ACTIVO' AND p.stock_actual <= p.stock_minimo
        ORDER BY p.stock_actual ASC`);
    return rows;
};

// ── Ventas detalladas (PDF / Excel) ──
exports.getVentasDetalladas = async () => {
    const [rows] = await db.query(`
        SELECT pe.id_pedido, pe.fecha_pedido, per.nombres AS cliente, pe.estado,
               p.nombre AS producto, COALESCE(c.nombre,'-') AS categoria,
               dp.cantidad, dp.precio_unitario, dp.subtotal
        FROM detalle_pedido dp
        JOIN pedido pe   ON dp.id_pedido=pe.id_pedido
        JOIN producto p  ON dp.id_producto=p.id_producto
        LEFT JOIN categoria_producto c ON p.id_categoria=c.id_categoria
        JOIN cliente cl  ON pe.id_cliente=cl.id_cliente
        JOIN persona per ON cl.id_persona=per.id_persona
        WHERE pe.estado IN ${ESTADOS_VENTA}
        ORDER BY pe.fecha_pedido DESC`);
    return rows;
};

// ── Inventario actual (Excel) ──
exports.getInventario = async () => {
    const [rows] = await db.query(`
        SELECT p.id_producto, p.nombre, COALESCE(c.nombre,'-') AS categoria,
               COALESCE(ta.nombre,'-') AS tipo_animal, COALESCE(p.marca,'-') AS marca,
               p.precio_venta, p.stock_actual, p.stock_minimo, p.estado
        FROM producto p
        LEFT JOIN categoria_producto c ON p.id_categoria=c.id_categoria
        LEFT JOIN tipo_animal ta ON p.id_tipo_animal=ta.id_tipo_animal
        ORDER BY p.nombre ASC`);
    return rows;
};

// ── Exportaciones por entidad (genéricas) ──
exports.getClientesExport = async () => {
    const [rows] = await db.query(`
        SELECT per.nombres AS nombre, COALESCE(per.correo,'-') AS correo,
               COALESCE(per.telefono,'-') AS telefono,
               COALESCE(c.numero_documento,'-') AS documento,
               DATE_FORMAT(c.fecha_registro,'%d/%m/%Y') AS registro
        FROM cliente c JOIN persona per ON c.id_persona=per.id_persona
        ORDER BY c.fecha_registro DESC`);
    return rows;
};

exports.getPedidosExport = async () => {
    const [rows] = await db.query(`
        SELECT pe.id_pedido,
               DATE_FORMAT(pe.fecha_pedido,'%d/%m/%Y %H:%i') AS fecha,
               TRIM(CONCAT(COALESCE(per.nombres,''),' ',COALESCE(per.apellido_paterno,''))) AS cliente,
               pe.total, pe.estado
        FROM pedido pe
        LEFT JOIN cliente cl  ON pe.id_cliente=cl.id_cliente
        LEFT JOIN persona per ON cl.id_persona=per.id_persona
        ORDER BY pe.fecha_pedido DESC`);
    return rows;
};

exports.getCategoriasExport = async () => {
    const [rows] = await db.query(`
        SELECT id_categoria, nombre, COALESCE(descripcion,'-') AS descripcion, estado
        FROM categoria_producto ORDER BY id_categoria`);
    return rows;
};

exports.getAnimalesExport = async () => {
    const [rows] = await db.query(`
        SELECT id_tipo_animal, nombre, estado FROM tipo_animal ORDER BY id_tipo_animal`);
    return rows;
};

exports.getColaboradoresExport = async () => {
    const [rows] = await db.query(`
        SELECT col.id_colaborador,
               TRIM(CONCAT(COALESCE(per.nombres,''),' ',COALESCE(per.apellido_paterno,''))) AS nombre,
               COALESCE(col.usuario,'-') AS usuario,
               COALESCE(col.dni,'-')     AS dni,
               COALESCE(ca.nombre,'-')   AS cargo,
               COALESCE(per.correo,'-')  AS correo,
               col.estado
        FROM colaborador col
        LEFT JOIN persona per ON col.id_persona=per.id_persona
        LEFT JOIN cargo   ca  ON col.id_cargo=ca.id_cargo
        ORDER BY col.id_colaborador`);
    return rows;
};
