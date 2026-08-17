const { enviarNotificacion } = require('../servicios/notificacion.service');
const culqiService    = require('../servicios/culqi.service');
const nubefactService = require('../servicios/nubefact.service');

const pedidoModel = require('../modelos/pedido.model');
const db          = require('../config/db');
const responder = require('../utils/responder');

// Emite el comprobante electrónico ante SUNAT vía NubeFacT. Se llama
// DESPUÉS de que el pago ya quedó confirmado (Yape o Culqi) — nunca
// antes, porque no tiene sentido facturar algo que no se pagó.
//
// Es "best effort": si NubeFacT falla (caído, mal configurado, etc.)
// el pedido y el pago YA quedaron guardados igual; el comprobante
// simplemente se queda en estado_sunat='PENDIENTE' para reintentar
// después, en vez de tumbar toda la compra del cliente por un problema
// ajeno a él.
async function emitirComprobanteElectronico(id_pedido, id_cliente, tipoComprobante, costoEnvio) {
    try {
        const pedido = await pedidoModel.obtenerPedidoCompleto(id_pedido);
        const cliente = await pedidoModel.obtenerDatosClienteParaComprobante(id_cliente);

        const total = Number(pedido.total);
        const subtotal = Number((total / 1.18).toFixed(2));
        const igv = Number((total - subtotal).toFixed(2));

        const comprobante = await pedidoModel.crearComprobante(
            id_pedido, tipoComprobante, id_cliente, { subtotal, igv, total }
        );

        const payload = nubefactService.construirPayload({
            pedido,
            cliente,
            detalles: pedido.detalles,
            tipoComprobante: tipoComprobante === 'factura' ? 'FACTURA' : 'BOLETA',
            serie: comprobante.serie,
            numero: comprobante.numero,
            costoEnvio
        });

        const respuesta = await nubefactService.generarComprobante(payload);

        await pedidoModel.actualizarComprobanteSunat(comprobante.id, {
            estado_sunat:  respuesta.aceptada_por_sunat ? 'ACEPTADO' : 'OBSERVADO',
            hash_cpe:      respuesta.codigo_hash,
            xml_cpe_url:   respuesta.enlace_del_xml,
            cdr_sunat_url: respuesta.enlace_del_cdr,
            archivo_pdf:   respuesta.enlace_del_pdf
        });

        return { ...comprobante, estado_sunat: respuesta.aceptada_por_sunat ? 'ACEPTADO' : 'OBSERVADO' };

    } catch (err) {
        console.error(`No se pudo emitir el comprobante SUNAT del pedido #${id_pedido}:`, err.message);
        // El comprobante ya quedó creado en estado PENDIENTE (si el error
        // fue de NubeFacT y no de nuestra propia BD) — se puede reintentar
        // manualmente desde el panel admin más adelante.
        return null;
    }
}

exports.crearPedido = async (req, res) => {
    try {
        const id_persona = req.usuario.id; // verificarToken ya validó el JWT (ver pedido.routes.js)

        const [clienteRows] = await db.query(
            'SELECT id_cliente, id_persona FROM cliente WHERE id_persona = ?', [id_persona]
        );
        if (!clienteRows.length) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
        const id_cliente = clienteRows[0].id_cliente;

        const { carrito, datosEnvio, datosComprobante, metodoPago, codigoTransaccion, culqiTokenId } = req.body;

        if (!carrito || !carrito.length) {
            return res.status(400).json({ mensaje: 'El carrito está vacío' });
        }

        const id_tipo_comprobante = datosComprobante.tipo === 'factura' ? 2 : 1;

        let id_tipo_pago, pasarela = null, respuestaPasarela = null, codigoFinal = codigoTransaccion;

        if (metodoPago === 'yape') {
            // Cobro manual: el cliente ya pagó por Yape y pega el N° de operación
            if (!/^\d{6,}$/.test(String(codigoTransaccion || '').trim())) {
                return res.status(400).json({ mensaje: 'Número de operación Yape inválido (solo dígitos, mínimo 6).' });
            }
            id_tipo_pago = 1;

        } else if (metodoPago === 'culqi') {
            // Cobro con tarjeta vía Culqi. El token ya viene tokenizado desde
            // el frontend (CulqiJS) — nunca pasa el número de tarjeta por acá.
            if (!culqiTokenId) {
                return res.status(400).json({ mensaje: 'Falta el token de la tarjeta' });
            }

            const [personaRows] = await db.query(
                'SELECT correo FROM persona WHERE id_persona = ?', [id_persona]
            );
            const correo = personaRows[0]?.correo;

            let cargo;
            try {
                cargo = await culqiService.crearCargo({
                    tokenId: culqiTokenId,
                    montoSoles: Number(datosEnvio.total),
                    email: correo,
                    descripcion: `Pedido AgroVeterinaria ALIVET - Cliente #${id_cliente}`,
                    metadata: { id_cliente: String(id_cliente) }
                });
            } catch (err) {
                if (err.configuracion) {
                    // No es que el banco rechazó nada: al servidor le falta
                    // configurar CULQI_SECRET_KEY. No se le debe decir al
                    // cliente "tu pago fue rechazado" por un error nuestro.
                    console.error('Culqi no está configurado:', err.message);
                    return res.status(503).json({ mensaje: 'El pago con tarjeta no está disponible en este momento. Intenta con Yape.' });
                }
                // Pago rechazado por el banco/Culqi: NO se crea ningún pedido,
                // así no quedan pedidos "fantasma" sin pagar en la BD.
                console.error('Cargo Culqi rechazado:', err.culqi || err.message);
                return res.status(402).json({ mensaje: err.message || 'El pago con tarjeta fue rechazado' });
            }

            id_tipo_pago       = 2;
            pasarela            = 'CULQI';
            respuestaPasarela   = cargo;
            codigoFinal         = cargo.id; // ej. "chr_test_xxx"

        } else {
            return res.status(400).json({ mensaje: 'Método de pago no disponible. Usa Yape o tarjeta.' });
        }

        // A partir de aquí el pago YA está confirmado (Yape verificado a mano
        // por el admin, o Culqi ya cobró de verdad) — recién ahora se crea el pedido.
        const id_pedido = await pedidoModel.crearPedido({
            id_cliente,
            id_distrito:         datosEnvio.id_distrito,
            id_tipo_comprobante,
            total:               datosEnvio.total,
            costo_envio:         datosEnvio.costo_envio,
            direccion_entrega:   datosEnvio.direccion
        });

        await pedidoModel.crearDetallePedido(id_pedido, carrito);
        await pedidoModel.crearPago(id_pedido, id_tipo_pago, datosEnvio.total, codigoFinal, pasarela, respuestaPasarela);
        await db.query("UPDATE pedido SET estado = 'PAGADO' WHERE id_pedido = ?", [id_pedido]);

        // Facturación electrónica SUNAT (best-effort, ver función arriba)
        const comprobante = await emitirComprobanteElectronico(
            id_pedido, id_cliente, datosComprobante.tipo, datosEnvio.costo_envio
        );

        const pedidoCompleto = await pedidoModel.obtenerPedidoCompleto(id_pedido);
        await enviarNotificacion(
            '🛒 Nuevo pedido recibido',
            `Pedido #${id_pedido} de ${pedidoCompleto.cliente_nombre} por S/. ${pedidoCompleto.total}`,
            { tipo: 'nuevo_pedido', id_pedido: String(id_pedido) }
        );

        res.status(201).json({
            mensaje: 'Pedido creado exitosamente',
            id_pedido,
            comprobante: comprobante || { serie: null, numero: null, estado_sunat: 'PENDIENTE' },
            pedido: pedidoCompleto
        });

    } catch (err) {
        responder.error(res, 500, 'Error al procesar el pedido', err, 'Error al crear pedido:');
    }
};

exports.obtenerPedidos = async (req, res) => {
    try {
        const id_persona = req.usuario.id;

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
        const id_persona = req.usuario.id;

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

        const detallesConMarca = await pedidoModel.obtenerDetallesConImagen(req.params.id);

        res.json({ ...pedidoRows[0], detalles: detallesConMarca });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'Error al obtener detalle del pedido' });
    }
};
