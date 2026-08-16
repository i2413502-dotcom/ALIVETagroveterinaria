const db = require('../config/db');

exports.crearPedido = async (datos) => {
    const { id_cliente, id_distrito, id_tipo_comprobante,
            total, costo_envio, direccion_entrega } = datos;

    const [result] = await db.query(
        `INSERT INTO pedido
         (id_cliente, id_distrito, id_tipo_comprobante, total, costo_envio,
          direccion_entrega, estado, fecha_pedido)
         VALUES (?, ?, ?, ?, ?, ?, 'PENDIENTE', NOW())`,
        [id_cliente, parseInt(id_distrito, 10), id_tipo_comprobante,
         total, costo_envio, direccion_entrega]
    );
    return result.insertId;
};

exports.crearDetallePedido = async (id_pedido, items) => {
    for (const item of items) {
        await db.query(
            `INSERT INTO detalle_pedido 
             (id_pedido, id_producto, cantidad, precio_unitario, subtotal, color, talla, marca)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id_pedido,
                item.id_producto,
                item.cantidad,
                item.precio,
                item.precio * item.cantidad,
                item.color  || null,
                item.talla  || null,
                item.marca  || null
            ]
        );
        await db.query(
            `UPDATE producto SET stock_actual = stock_actual - ? 
             WHERE id_producto = ?`,
            [item.cantidad, item.id_producto]
        );
    }
};

// pasarela: null (Yape, cobro manual) | 'CULQI' (cobro con tarjeta)
// respuestaPasarela: objeto crudo devuelto por la pasarela, para auditoría
exports.crearPago = async (id_pedido, id_tipo_pago, monto, codigoTransaccion, pasarela = null, respuestaPasarela = null) => {
    const [result] = await db.query(
        `INSERT INTO pago 
         (id_pedido, id_tipo_pago, monto, estado, codigo_transaccion, pasarela, respuesta_pasarela, fecha_pago)
         VALUES (?, ?, ?, 'COMPLETADO', ?, ?, ?, NOW())`,
        [id_pedido, id_tipo_pago, monto, codigoTransaccion, pasarela,
         respuestaPasarela ? JSON.stringify(respuestaPasarela) : null]
    );
    return result.insertId;
};

// Datos del cliente que necesita NubeFacT/SUNAT para el comprobante
// (razón social si es factura, DNI/nombre si es boleta, dirección, correo)
exports.obtenerDatosClienteParaComprobante = async (id_cliente) => {
    const [rows] = await db.query(
        `SELECT per.correo, per.nombres, per.apellido_paterno, per.apellido_materno,
                c.numero_documento, td.nombre AS tipo_documento,
                c.razon_social, c.direccion_habitual
         FROM cliente c
         JOIN persona per ON per.id_persona = c.id_persona
         LEFT JOIN tipo_documento td ON td.id_tipo_documento = c.id_tipo_documento
         WHERE c.id_cliente = ?`,
        [id_cliente]
    );
    if (!rows.length) return null;
    const r = rows[0];
    return {
        correo: r.correo,
        numero_documento: r.numero_documento,
        tipo_documento: r.tipo_documento,
        razon_social: r.razon_social,
        direccion: r.direccion_habitual,
        nombre_completo: [r.nombres, r.apellido_paterno, r.apellido_materno].filter(Boolean).join(' ')
    };
};

// Siguiente número correlativo para una serie (B001/F001), de forma
// segura ante pedidos concurrentes: usa una transacción con bloqueo de
// fila (FOR UPDATE) para que dos pedidos simultáneos nunca reciban el
// mismo número — SUNAT exige correlativos estrictamente secuenciales
// sin huecos ni repeticiones por serie.
async function obtenerSiguienteNumero(conn, serie) {
    const [rows] = await conn.query(
        'SELECT numero FROM comprobante WHERE serie = ? ORDER BY id_comprobante DESC LIMIT 1 FOR UPDATE',
        [serie]
    );
    const ultimo = rows.length ? parseInt(rows[0].numero, 10) || 0 : 0;
    return String(ultimo + 1).padStart(6, '0');
}

// Crea el comprobante con todos los datos que SUNAT/NubeFacT necesitan
// (antes solo se guardaba serie/numero, el resto quedaba NULL).
// tipo: 'factura' | 'boleta'
exports.crearComprobante = async (id_pedido, tipo, id_cliente, totales) => {
    const esFactura = tipo === 'factura';
    const serie = esFactura ? 'F001' : 'B001';
    const id_tipo_comprobante = esFactura ? 2 : 1; // catálogo tipo_comprobante

    const cliente = await exports.obtenerDatosClienteParaComprobante(id_cliente);

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const numero = await obtenerSiguienteNumero(conn, serie);

        const [result] = await conn.query(
            `INSERT INTO comprobante
                (id_pedido, serie, numero, fecha_emision, tipo, id_tipo_comprobante,
                 ruc_cliente, razon_social, direccion_fiscal, dni_cliente, nombre_cliente,
                 subtotal, igv, total, estado_sunat)
             VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE')`,
            [
                id_pedido, serie, numero, esFactura ? 'FACTURA' : 'BOLETA', id_tipo_comprobante,
                esFactura ? cliente?.numero_documento : null,
                esFactura ? cliente?.razon_social : null,
                cliente?.direccion || null,
                !esFactura ? cliente?.numero_documento : null,
                !esFactura ? cliente?.nombre_completo : null,
                totales.subtotal, totales.igv, totales.total
            ]
        );

        await conn.commit();
        return { id: result.insertId, serie, numero, cliente };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
};

// Guarda la respuesta de NubeFacT/SUNAT en el comprobante ya creado.
exports.actualizarComprobanteSunat = async (id_comprobante, datos) => {
    await db.query(
        `UPDATE comprobante SET
            estado_sunat  = ?,
            hash_cpe      = ?,
            xml_cpe_url   = ?,
            cdr_sunat_url = ?,
            archivo_pdf   = ?
         WHERE id_comprobante = ?`,
        [
            datos.estado_sunat,
            datos.hash_cpe || null,
            datos.xml_cpe_url || null,
            datos.cdr_sunat_url || null,
            datos.archivo_pdf || null,
            id_comprobante
        ]
    );
};

// Detalle de items de un pedido, con la imagen PRINCIPAL del producto
// (antes leía producto.imagen, columna heredada que ya no se actualiza
// desde que las imágenes viven en imagen_producto — ver imagen.model.js).
async function obtenerDetallesConImagen(id_pedido) {
    const [detalles] = await db.query(
        `SELECT dp.*, pr.nombre AS producto_nombre, pr.marca AS marca_producto,
                img.url_imagen AS imagen
         FROM detalle_pedido dp
         JOIN producto pr ON dp.id_producto = pr.id_producto
         LEFT JOIN imagen_producto img
                ON img.id_producto = pr.id_producto AND img.es_principal = 1
         WHERE dp.id_pedido = ?`,
        [id_pedido]
    );
    return detalles.map(d => ({ ...d, marca: d.marca || d.marca_producto || null }));
}
exports.obtenerDetallesConImagen = obtenerDetallesConImagen;

exports.obtenerPedidoCompleto = async (id_pedido) => {
    const [pedido] = await db.query(
        `SELECT p.*,
                per.nombres AS cliente_nombre,
                per.correo AS cliente_correo,
                c.numero_documento AS cliente_documento,
                d.nombre AS nombre_distrito,
                tc.nombre AS tipo_comprobante
         FROM pedido p
         JOIN cliente c ON p.id_cliente = c.id_cliente
         JOIN persona per ON c.id_persona = per.id_persona
         LEFT JOIN distrito d ON p.id_distrito = d.id_distrito
         LEFT JOIN tipo_comprobante tc ON p.id_tipo_comprobante = tc.id_tipo_comprobante
         WHERE p.id_pedido = ?`,
        [id_pedido]
    );

    const detallesConMarca = await obtenerDetallesConImagen(id_pedido);

    return { ...pedido[0], detalles: detallesConMarca };
};
