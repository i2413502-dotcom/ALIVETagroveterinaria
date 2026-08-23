const db = require('../config/db');

exports.getDashboardData = async () => {
    const [[clientes]]          = await db.query("SELECT COUNT(*) total FROM cliente");
    const [[pedidosPendientes]] = await db.query("SELECT COUNT(*) total FROM pedido WHERE estado='PENDIENTE'");
    const [[pedidosEntregados]] = await db.query("SELECT COUNT(*) total FROM pedido WHERE estado='ENTREGADO'");
    const [[productos]]         = await db.query("SELECT COUNT(*) total FROM producto WHERE estado='ACTIVO'");
    const [[stockBajo]]         = await db.query("SELECT COUNT(*) total FROM producto WHERE stock_actual <= stock_minimo");
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

// Se utiliza para el móvil
exports.getTopClientes = async (limite = 10) => {
    const n = Math.max(1, Math.min(parseInt(limite) || 10, 50));
    const [rows] = await db.query(`
        SELECT
            identidad,
            -- Nombre y correo del pedido MÁS RECIENTE de esa identidad —
            -- si la persona se registró varias veces, se usa el dato
            -- más actual en vez de mezclar todos.
            SUBSTRING_INDEX(GROUP_CONCAT(nombres ORDER BY fecha_pedido DESC SEPARATOR '||'), '||', 1) AS nombres,
            SUBSTRING_INDEX(GROUP_CONCAT(correo  ORDER BY fecha_pedido DESC SEPARATOR '||'), '||', 1) AS correo,
            COUNT(*)                    AS total_pedidos,
            COALESCE(SUM(total), 0)     AS total_gastado
        FROM (
            SELECT
                pe.id_pedido, pe.fecha_pedido, pe.total,
                -- DNI con el que se REGISTRÓ la cuenta (cliente.numero_
                -- documento) — a diferencia del DNI/RUC de cada boleta,
                -- este no cambia entre boleta y factura de la misma
                -- cuenta, y sí une varias cuentas registradas con el
                -- mismo DNI real (aunque tengan correos distintos).
                COALESCE(NULLIF(c.numero_documento, ''), CONCAT('SIN-DOC-', pe.id_cliente)) AS identidad,
                COALESCE(co.razon_social, co.nombre_cliente, per.nombres) AS nombres,
                per.correo AS correo
            FROM pedido pe
            JOIN cliente    c   ON pe.id_cliente = c.id_cliente
            JOIN persona    per ON c.id_persona  = per.id_persona
            LEFT JOIN comprobante co ON co.id_pedido = pe.id_pedido
            -- Se cuenta CUALQUIER pedido (incluso cancelado). El orden
            -- es por CANTIDAD de pedidos, no por dinero — así un
            -- pedido de prueba con un monto absurdo (ej. S/. 1,069,160
            -- en un pedido cancelado) no se cuela arriba del ranking
            -- ni rompe la escala del gráfico, porque cuenta como 1
            -- pedido igual que cualquier otro.
        ) datos
        GROUP BY identidad
        ORDER BY total_pedidos DESC, total_gastado DESC
        LIMIT ${n}
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

// Evidencia fotográfica de cancelación (ej. repartidor no pudo entregar,
// cliente rechazó el producto, etc.) — guarda la URL de la foto (ya
// subida a R2) y cambia el estado a CANCELADO en un solo UPDATE, para
// que quede registrado el motivo visual junto con el cambio de estado.
exports.guardarEvidenciaCancelacion = async (id, urlEvidencia) => {
    await db.query(
        "UPDATE pedido SET evidencia_url = ?, estado = 'CANCELADO' WHERE id_pedido = ?",
        [urlEvidencia, id]
    );
};

// Buscar un pedido por su código de boleta/factura (ej. "F001-000065",
// solo la serie, o solo el número) — para identificar a qué pedido
// pertenece la evidencia antes de subirla. Reutiliza el mismo patrón
// de búsqueda flexible que ya usa venta.model.js -> listarVentas.
exports.buscarPorCodigoComprobante = async (codigo) => {
    const like = `%${codigo}%`;
    const [rows] = await db.query(
        `SELECT pe.id_pedido, pe.estado, pe.tipo_entrega,
                CONCAT(COALESCE(co.serie,''),'-',COALESCE(co.numero,'')) AS comprobante,
                COALESCE(per.nombres, cli.razon_social, co.nombre_cliente, co.razon_social) AS cliente
         FROM pedido pe
         LEFT JOIN comprobante co ON co.id_pedido = pe.id_pedido
         LEFT JOIN cliente cli    ON cli.id_cliente = pe.id_cliente
         LEFT JOIN persona per    ON per.id_persona = cli.id_persona
         WHERE co.numero LIKE ? OR co.serie LIKE ?
            OR CONCAT(COALESCE(co.serie,''),'-',COALESCE(co.numero,'')) LIKE ?
         ORDER BY pe.id_pedido DESC
         LIMIT 1`,
        [like, like, like]
    );
    return rows[0] || null;
};