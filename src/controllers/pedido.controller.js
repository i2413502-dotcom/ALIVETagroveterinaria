const { enviarNotificacion } = require('../services/notificacion.service');

const pedidoModel = require('../models/pedido.model');
const jwt         = require('jsonwebtoken');
const db          = require('../config/db');

exports.crearPedido = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ mensaje: 'No autorizado' });

        const decoded    = jwt.verify(token, process.env.JWT_SECRET);
        const id_persona = decoded.id;

        const [clienteRows] = await db.query(
            'SELECT id_cliente FROM cliente WHERE id_persona = ?', [id_persona]
        );
        if (!clienteRows.length) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
        const id_cliente = clienteRows[0].id_cliente;

        const { carrito, datosEnvio, datosComprobante, metodoPago, codigoTransaccion } = req.body;

        const id_tipo_comprobante = datosComprobante.tipo === 'factura' ? 2 : 1;
        const id_tipo_pago        = metodoPago === 'yape' ? 1 : 2;

        const id_pedido = await pedidoModel.crearPedido({
            id_cliente,
            id_distrito:         datosEnvio.id_distrito,
            id_tipo_comprobante,
            total:               datosEnvio.total,
            costo_envio:         datosEnvio.costo_envio,
            direccion_entrega:   datosEnvio.direccion
        });

        await pedidoModel.crearDetallePedido(id_pedido, carrito);
        await pedidoModel.crearPago(id_pedido, id_tipo_pago, datosEnvio.total, codigoTransaccion);
        await db.query("UPDATE pedido SET estado = 'PAGADO' WHERE id_pedido = ?", [id_pedido]);
        const comprobante  = await pedidoModel.crearComprobante(id_pedido, datosComprobante.tipo);
        const pedidoCompleto = await pedidoModel.obtenerPedidoCompleto(id_pedido);
        await enviarNotificacion(
    '🛒 Nuevo pedido recibido',
    `Pedido #${id_pedido} de ${pedidoCompleto.cliente_nombre} por S/. ${pedidoCompleto.total}`,
    { tipo: 'nuevo_pedido', id_pedido: String(id_pedido) }
);

        res.status(201).json({ mensaje: 'Pedido creado exitosamente', id_pedido, comprobante, pedido: pedidoCompleto });

    } catch (err) {
        console.error('Error al crear pedido:', err);
        res.status(500).json({ mensaje: 'Error al procesar el pedido' });
    }
};

exports.obtenerPedidos = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ mensaje: 'No autorizado' });

        const decoded    = jwt.verify(token, process.env.JWT_SECRET);
        const id_persona = decoded.id;

        const [clienteRows] = await db.query(
            'SELECT id_cliente FROM cliente WHERE id_persona = ?', [id_persona]
        );
        if (!clienteRows.length) return res.json([]);
        const id_cliente = clienteRows[0].id_cliente;

        const [pedidos] = await db.query(`
            SELECT p.*, tc.nombre AS tipo_comprobante,
                   (SELECT COUNT(*) FROM detalle_pedido dp WHERE dp.id_pedido = p.id_pedido) AS total_items
            FROM pedido p
            LEFT JOIN tipo_comprobante tc ON p.id_tipo_comprobante = tc.id_tipo_comprobante
            WHERE p.id_cliente = ?
            ORDER BY p.fecha_pedido DESC
        `, [id_cliente]);

        res.json(pedidos);
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'Error al obtener pedidos' });
    }
};

exports.obtenerDetallePedido = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ mensaje: 'No autorizado' });

        const decoded    = jwt.verify(token, process.env.JWT_SECRET);
        const id_persona = decoded.id;

        // Verificar que el pedido pertenece al cliente
        const [clienteRows] = await db.query(
            'SELECT id_cliente FROM cliente WHERE id_persona = ?', [id_persona]
        );
        if (!clienteRows.length) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
        const id_cliente = clienteRows[0].id_cliente;

        const [pedidoRows] = await db.query(
            'SELECT * FROM pedido WHERE id_pedido = ? AND id_cliente = ?',
            [req.params.id, id_cliente]
        );
        if (!pedidoRows.length) return res.status(404).json({ mensaje: 'Pedido no encontrado' });

        const pedido = pedidoRows[0];

const [detalles] = await db.query(`
    SELECT dp.*, pr.nombre AS producto_nombre, pr.imagen,
           pr.marca AS marca_producto
    FROM detalle_pedido dp
    JOIN producto pr ON dp.id_producto = pr.id_producto
    WHERE dp.id_pedido = ?
`, [req.params.id]);

// ✅ Usar marca del detalle si existe, sino la del producto
const detallesConMarca = detalles.map(d => ({
    ...d,
    marca: d.marca || d.marca_producto || null
}));

res.json({ ...pedido, detalles: detallesConMarca });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'Error al obtener detalle del pedido' });
    }
};