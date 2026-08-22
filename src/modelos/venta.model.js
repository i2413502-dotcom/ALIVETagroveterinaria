const db = require('../config/db');

// Se muestran TODOS los estados de pedido en Ventas (antes solo
// PAGADO/ENTREGADO). Se mantiene la lista para validar el filtro
// que llega por query string, ahora con los 5 estados reales.
const ESTADOS_VENTA = ['PENDIENTE', 'PAGADO', 'ENVIADO', 'ENTREGADO', 'CANCELADO'];
const TIPOS_ENTREGA = ['DELIVERY', 'RECOJO_TIENDA'];

// Estados que corresponden a cada pestaña de la pantalla de Ventas.
// "activos"   -> aún requieren gestión (se muestran por defecto)
// "historial" -> ya se cerraron (entregado o cancelado), no se borran,
//                solo se dejan de mostrar en la vista principal.
const ESTADOS_POR_VISTA = {
    activos:   ['PENDIENTE', 'PAGADO', 'ENVIADO'],
    historial: ['ENTREGADO', 'CANCELADO']
};

// Construye el WHERE + params según filtros (estado / rango de fechas / vista / tipo de entrega)
function construirFiltros(filtros = {}) {
    let where = 'WHERE 1=1';
    const params = [];

    // Pestaña Activos / Historial. Si además viene un "estado" puntual
    // (del <select> de Estado), este debe pertenecer a la vista actual;
    // si no pertenece, se ignora el estado puntual y manda la vista.
    if (filtros.vista && ESTADOS_POR_VISTA[filtros.vista]) {
        const estadosVista = ESTADOS_POR_VISTA[filtros.vista];
        if (filtros.estado && estadosVista.includes(filtros.estado)) {
            where += ' AND pe.estado = ?';
            params.push(filtros.estado);
        } else {
            where += ` AND pe.estado IN (${estadosVista.map(() => '?').join(',')})`;
            params.push(...estadosVista);
        }
    } else if (filtros.estado && ESTADOS_VENTA.includes(filtros.estado)) {
        where += ' AND pe.estado = ?';
        params.push(filtros.estado);
    }

    if (filtros.tipoEntrega && TIPOS_ENTREGA.includes(filtros.tipoEntrega)) {
        where += ' AND pe.tipo_entrega = ?';
        params.push(filtros.tipoEntrega);
    }

    if (filtros.desde) {
        where += ' AND DATE(pe.fecha_pedido) >= ?';
        params.push(filtros.desde);
    }
    if (filtros.hasta) {
        where += ' AND DATE(pe.fecha_pedido) <= ?';
        params.push(filtros.hasta);
    }
    // Búsqueda por código de comprobante: acepta "B001-000069",
    // solo la serie ("B001") o solo el número ("000069" o "69").
    if (filtros.codigo && filtros.codigo.trim()) {
        const like = `%${filtros.codigo.trim()}%`;
        where += ` AND (
            co.numero LIKE ? OR
            co.serie LIKE ? OR
            CONCAT(COALESCE(co.serie,''),'-',COALESCE(co.numero,'')) LIKE ?
        )`;
        params.push(like, like, like);
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
           pe.estado,
           pe.tipo_entrega
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

    // El conteo ahora también puede depender del filtro por código de
    // comprobante, así que necesita el mismo JOIN que la lista principal.
    // COUNT(DISTINCT ...) evita duplicar si un pedido tuviera más de un
    // registro de pago (mismo caso que el GROUP BY de arriba).
    const [[count]] = await db.query(
        `SELECT COUNT(DISTINCT pe.id_pedido) AS total
         FROM pedido pe
         LEFT JOIN comprobante co ON co.id_pedido = pe.id_pedido
         ${where}`, params
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
               pe.tipo_entrega, pe.direccion_entrega,
               co.serie, co.numero, co.tipo, co.fecha_emision,
               co.nombre_cliente, co.razon_social, co.dni_cliente, co.ruc_cliente,
               co.subtotal, co.igv, co.total AS total_comprobante,
               TRIM(CONCAT(COALESCE(per.nombres,''),' ',
                           COALESCE(per.apellido_paterno,''),' ',
                           COALESCE(per.apellido_materno,''))) AS cliente_persona,
               -- Teléfono de la PERSONA real (no de la empresa en la
               -- factura) — sirve para saber a quién contactar al
               -- entregar o recoger, sin importar si es boleta o factura.
               per.telefono AS cliente_telefono
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
