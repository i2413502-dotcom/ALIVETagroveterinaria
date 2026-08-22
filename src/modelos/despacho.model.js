const db = require('../config/db');

// "Por Entregar Hoy": pantalla operativa sin filtros. Muestra TODO lo
// pendiente de entregar -sea Delivery o Recojo en Tienda- que ya está
// pagado o en camino. Reutiliza la tabla `pedido`, no crea datos nuevos.
// Se ordena solo: primero lo más urgente (ENVIADO), luego lo que falta
// despachar/recoger (PAGADO), y dentro de cada grupo lo más antiguo primero.
exports.listarPendientes = async () => {
    const [rows] = await db.query(`
        SELECT pe.id_pedido, pe.fecha_pedido AS fecha, pe.estado,
               pe.tipo_entrega, pe.direccion_entrega, pe.costo_envio, pe.total,
               pe.repartidor,
               d.nombre AS distrito,
               TRIM(CONCAT(COALESCE(per.nombres,''),' ',
                           COALESCE(per.apellido_paterno,''),' ',
                           COALESCE(per.apellido_materno,''))) AS cliente,
               per.telefono
        FROM pedido pe
        LEFT JOIN cliente  cl  ON pe.id_cliente = cl.id_cliente
        LEFT JOIN persona  per ON cl.id_persona = per.id_persona
        LEFT JOIN distrito d   ON pe.id_distrito = d.id_distrito
        WHERE pe.estado IN ('PAGADO', 'ENVIADO')
        ORDER BY FIELD(pe.estado,'ENVIADO','PAGADO'), pe.fecha_pedido ASC
    `);
    return rows;
};

// ── Asignar / cambiar el repartidor de un pedido (solo aplica a Delivery) ──
exports.asignarRepartidor = async (idPedido, repartidor) => {
    await db.query(
        "UPDATE pedido SET repartidor = ? WHERE id_pedido = ?",
        [repartidor || null, idPedido]
    );
};
