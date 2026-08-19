const db = require('../config/db');

exports.crearPedido = async (datos) => {
    const { id_cliente, id_distrito, id_zona, id_tipo_comprobante,
            total, costo_envio, direccion_entrega, tipo_entrega } = datos;

    const [result] = await db.query(
        `INSERT INTO pedido
         (id_cliente, id_distrito, id_zona, id_tipo_comprobante, total, costo_envio,
          direccion_entrega, tipo_entrega, estado, fecha_pedido)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', NOW())`,
        [id_cliente, id_distrito ? parseInt(id_distrito, 10) : null,
         id_zona ? parseInt(id_zona, 10) : null, id_tipo_comprobante,
         total, costo_envio, direccion_entrega, tipo_entrega || 'DELIVERY']
    );
    return result.insertId;
};

exports.crearDetallePedido = async (id_pedido, items) => {
    for (const item of items) {
        // Verificar stock disponible ANTES de descontar — evita que el
        // stock quede en negativo si se compra más de lo que hay.
        const [[productoActual]] = await db.query(
            'SELECT nombre, stock_actual FROM producto WHERE id_producto = ?',
            [item.id_producto]
        );
        if (!productoActual || productoActual.stock_actual < item.cantidad) {
            const nombreProd = productoActual ? productoActual.nombre : `#${item.id_producto}`;
            const err = new Error(`Stock insuficiente para "${nombreProd}"`);
            err.stockInsuficiente = true;
            throw err;
        }

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
        // Si el stock llegó a 0, desactivar el producto automáticamente
        // (ya no aparece disponible en el catálogo hasta que se reponga).
        await db.query(
            `UPDATE producto SET estado = 'INACTIVO'
             WHERE id_producto = ? AND stock_actual <= 0`,
            [item.id_producto]
        );
    }
};

exports.crearPago = async (id_pedido, id_tipo_pago, monto, codigoTransaccion, pasarela, respuestaPasarela) => {
    const [result] = await db.query(
        `INSERT INTO pago 
         (id_pedido, id_tipo_pago, monto, estado, codigo_transaccion, pasarela, respuesta_pasarela, fecha_pago)
         VALUES (?, ?, ?, 'COMPLETADO', ?, ?, ?, NOW())`,
        [
            id_pedido, id_tipo_pago, monto, codigoTransaccion || null,
            pasarela || null,
            respuestaPasarela ? JSON.stringify(respuestaPasarela) : null
        ]
    );
    return result.insertId;
};

exports.crearComprobante = async (id_pedido, tipo, datosCliente = {}) => {
    const serie = tipo === 'factura' ? 'F001' : 'B001';
    const numero = String(id_pedido).padStart(6, '0');
    const tipoDb = tipo === 'factura' ? 'FACTURA' : 'BOLETA';

    const [result] = await db.query(
        `INSERT INTO comprobante
         (id_pedido, id_tipo_comprobante, serie, numero, fecha_emision, tipo,
          ruc_cliente, razon_social, direccion_fiscal, dni_cliente, nombre_cliente,
          estado_sunat)
         VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, 'PENDIENTE')`,
        [
            id_pedido,
            tipo === 'factura' ? 2 : 1, // id_tipo_comprobante: 1=Boleta, 2=Factura (ver tabla tipo_comprobante)
            serie, numero, tipoDb,
            tipo === 'factura' ? (datosCliente.ruc || null) : null,
            tipo === 'factura' ? (datosCliente.razon_social || null) : null,
            tipo === 'factura' ? (datosCliente.direccion_fiscal || null) : null,
            tipo === 'boleta' ? (datosCliente.dni || null) : null,
            tipo === 'boleta' ? (datosCliente.nombre || null) : null
        ]
    );
    return { serie, numero, id: result.insertId };
};

// Guarda los montos calculados (subtotal/IGV/total) del comprobante — se
// llama junto con crearComprobante o justo antes de emitir ante SUNAT.
exports.actualizarMontosComprobante = async (id_comprobante, { subtotal, igv, total }) => {
    await db.query(
        `UPDATE comprobante SET subtotal = ?, igv = ?, total = ? WHERE id_comprobante = ?`,
        [subtotal, igv, total, id_comprobante]
    );
};

// Actualiza el resultado de la emisión ante SUNAT vía NubeFacT (se llama
// después de crearComprobante, cuando el pago ya fue confirmado).
exports.actualizarEstadoSunat = async (id_comprobante, { estado_sunat, archivo_pdf, xml_cpe_url, cdr_sunat_url, hash_cpe, sunat_description }) => {
    await db.query(
        `UPDATE comprobante
         SET estado_sunat = ?, archivo_pdf = ?, xml_cpe_url = ?, cdr_sunat_url = ?, hash_cpe = ?, sunat_description = ?
         WHERE id_comprobante = ?`,
        [
            estado_sunat,
            archivo_pdf || null, xml_cpe_url || null, cdr_sunat_url || null, hash_cpe || null,
            sunat_description || null,
            id_comprobante
        ]
    );
};

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

    const [detalles] = await db.query(
        `SELECT dp.*, pr.nombre AS producto_nombre, pr.imagen, pr.marca AS marca_producto
         FROM detalle_pedido dp
         JOIN producto pr ON dp.id_producto = pr.id_producto
         WHERE dp.id_pedido = ?`,
        [id_pedido]
    );

    // ✅ Usar marca del detalle si existe, sino la del producto
    const detallesConMarca = detalles.map(d => ({
        ...d,
        marca: d.marca || d.marca_producto || null
    }));

    return { ...pedido[0], detalles: detallesConMarca };
};