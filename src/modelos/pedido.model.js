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

exports.crearPago = async (id_pedido, id_tipo_pago, monto, codigoTransaccion) => {
    const [result] = await db.query(
        `INSERT INTO pago 
         (id_pedido, id_tipo_pago, monto, estado, codigo_transaccion, fecha_pago)
         VALUES (?, ?, ?, 'COMPLETADO', ?, NOW())`,
        [id_pedido, id_tipo_pago, monto, codigoTransaccion]
    );
    return result.insertId;
};

exports.crearComprobante = async (id_pedido, tipo) => {
    const serie = tipo === 'factura' ? 'F001' : 'B001';
    const numero = String(id_pedido).padStart(6, '0');
    
    const [result] = await db.query(
        `INSERT INTO comprobante 
         (id_pedido, serie, numero, fecha_emision)
         VALUES (?, ?, ?, NOW())`,
        [id_pedido, serie, numero]
    );
    return { serie, numero, id: result.insertId };
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