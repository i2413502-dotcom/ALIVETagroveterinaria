const db = require('../config/db');

// Solo se consideran ventas los pedidos PAGADO y ENTREGADO
const ESTADOS_VENTA = ['PAGADO', 'ENTREGADO'];

// Construye el WHERE + params según filtros (estado / rango de fechas)
function construirFiltros(filtros = {}) {
    let where = "WHERE pe.estado IN ('PAGADO','ENTREGADO')";
    const params = [];

    if (filtros.estado && ESTADOS_VENTA.includes(filtros.estado)) {
        where += ' AND pe.estado = ?';
        params.push(filtros.estado);
    }
    if (filtros.desde) {
        where += ' AND DATE(pe.fecha_pedido) >= ?';
        params.push(filtros.desde);
    }
    if (filtros.hasta) {
        where += ' AND DATE(pe.fecha_pedido) <= ?';
        params.push(filtros.hasta);
    }
    return { where, params };
}

const SELECT_LISTA = `
    SELECT pe.id_pedido,
           CONCAT(COALESCE(co.serie,''),'-',COALESCE(co.numero,'')) AS comprobante,
           pe.fecha_pedido                                          AS fecha,
           TRIM(CONCAT(COALESCE(per.nombres,''),' ',
                       COALESCE(per.apellido_paterno,''),' ',
                       COALESCE(per.apellido_materno,'')))          AS cliente,
           UPPER(COALESCE(co.tipo,'BOLETA'))                        AS tipo,
           pe.total,
           COALESCE(tp.nombre,'-')                                  AS metodo_pago,
           pe.estado
    FROM pedido pe
    LEFT JOIN comprobante co ON co.id_pedido = pe.id_pedido
    LEFT JOIN cliente    cl  ON pe.id_cliente = cl.id_cliente
    LEFT JOIN persona    per ON cl.id_persona = per.id_persona
    LEFT JOIN pago       pg  ON pg.id_pedido = pe.id_pedido
    LEFT JOIN tipo_pago  tp  ON pg.id_tipo_pago = tp.id_tipo_pago
`;

// ── Lista paginada de ventas ──
exports.listarVentas = async (filtros = {}) => {
    const pagina = parseInt(filtros.pagina) || 1;
    const limite = parseInt(filtros.limite) || 20;
    const offset = (pagina - 1) * limite;
    const { where, params } = construirFiltros(filtros);

    const sql = `${SELECT_LISTA} ${where}
                 GROUP BY pe.id_pedido
                 ORDER BY pe.fecha_pedido DESC
                 LIMIT ? OFFSET ?`;
    const [rows] = await db.query(sql, [...params, limite, offset]);

    // El conteo solo depende de filtros sobre 'pedido'
    const [[count]] = await db.query(
        `SELECT COUNT(*) AS total FROM pedido pe ${where}`, params
    );

    return {
        ventas:       rows,
        total:        count.total,
        pagina,
        limite,
        totalPaginas: Math.ceil(count.total / limite) || 1
    };
};

// ── Todas las ventas (para exportar, sin paginar) ──
exports.listarVentasParaExportar = async (filtros = {}) => {
    const { where, params } = construirFiltros(filtros);
    const [rows] = await db.query(
        `${SELECT_LISTA} ${where} GROUP BY pe.id_pedido ORDER BY pe.fecha_pedido DESC`,
        params
    );
    return rows;
};

// ── Cabecera del comprobante de una venta ──
exports.obtenerComprobante = async (idPedido) => {
    const [rows] = await db.query(`
        SELECT pe.id_pedido, pe.fecha_pedido, pe.total AS total_pedido,
               pe.costo_envio, pe.estado,
               co.serie, co.numero, co.tipo, co.fecha_emision,
               co.nombre_cliente, co.razon_social, co.dni_cliente, co.ruc_cliente,
               co.subtotal, co.igv, co.total AS total_comprobante,
               TRIM(CONCAT(COALESCE(per.nombres,''),' ',
                           COALESCE(per.apellido_paterno,''),' ',
                           COALESCE(per.apellido_materno,''))) AS cliente_persona
        FROM pedido pe
        LEFT JOIN comprobante co ON co.id_pedido = pe.id_pedido
        LEFT JOIN cliente    cl  ON pe.id_cliente = cl.id_cliente
        LEFT JOIN persona    per ON cl.id_persona = per.id_persona
        WHERE pe.id_pedido = ?`, [idPedido]);
    return rows[0];
};

// ── Productos de una venta ──
exports.obtenerDetalleProductos = async (idPedido) => {
    const [rows] = await db.query(`
        SELECT dp.id_detalle, p.nombre AS producto,
               dp.cantidad, dp.precio_unitario, dp.subtotal,
               dp.color, dp.talla
        FROM detalle_pedido dp
        JOIN producto p ON dp.id_producto = p.id_producto
        WHERE dp.id_pedido = ?`, [idPedido]);
    return rows;
};
