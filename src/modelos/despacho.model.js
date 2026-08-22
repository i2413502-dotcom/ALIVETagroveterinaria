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
               pe.id_repartidor,
               TRIM(CONCAT(COALESCE(rper.nombres,''),' ',
                           COALESCE(rper.apellido_paterno,''),' ',
                           COALESCE(rper.apellido_materno,''))) AS repartidor_nombre,
               d.nombre AS distrito,
               TRIM(CONCAT(COALESCE(per.nombres,''),' ',
                           COALESCE(per.apellido_paterno,''),' ',
                           COALESCE(per.apellido_materno,''))) AS cliente,
               per.telefono
        FROM pedido pe
        LEFT JOIN cliente     cl   ON pe.id_cliente     = cl.id_cliente
        LEFT JOIN persona     per  ON cl.id_persona     = per.id_persona
        LEFT JOIN distrito    d    ON pe.id_distrito    = d.id_distrito
        -- Datos del repartidor asignado (si tiene) — es un colaborador real,
        -- no texto suelto, por eso el mismo patrón de JOIN colaborador+persona
        -- que ya usa el resto del sistema (ver venta.model.js -> cliente_persona).
        LEFT JOIN colaborador rcol ON pe.id_repartidor   = rcol.id_colaborador
        LEFT JOIN persona     rper ON rcol.id_persona    = rper.id_persona
        WHERE pe.estado IN ('PAGADO', 'ENVIADO')
        ORDER BY FIELD(pe.estado,'ENVIADO','PAGADO'), pe.fecha_pedido ASC
    `);
    return rows;
};

// ── Asignar / quitar el repartidor de un pedido (solo aplica a Delivery) ──
// idColaborador debe ser un id_colaborador real o null para "sin asignar".
exports.asignarRepartidor = async (idPedido, idColaborador) => {
    await db.query(
        'UPDATE pedido SET id_repartidor = ? WHERE id_pedido = ?',
        [idColaborador || null, idPedido]
    );
};

// ── Colaboradores activos, para la lista desplegable de repartidor ──
// Cualquier colaborador activo puede aparecer aquí (no se restringe por
// cargo, porque acordamos reutilizar cargos existentes en vez de crear
// uno nuevo "Repartidor").
exports.listarColaboradoresActivos = async () => {
    const [rows] = await db.query(`
        SELECT col.id_colaborador,
               TRIM(CONCAT(COALESCE(per.nombres,''),' ',
                           COALESCE(per.apellido_paterno,''),' ',
                           COALESCE(per.apellido_materno,''))) AS nombre
        FROM colaborador col
        JOIN persona per ON col.id_persona = per.id_persona
        WHERE col.estado = 'ACTIVO'
        ORDER BY nombre
    `);
    return rows;
};
