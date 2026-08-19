const pedidoModel      = require('../modelos/pedido.model');
const nubefactService  = require('../servicios/nubefact.service');
const mpService         = require('../servicios/mercadopago.service');
const jwt          = require('jsonwebtoken');
const db           = require('../config/db');
const responder    = require('../utils/responder');

// Emite el comprobante ante SUNAT vía NubeFacT. Se llama SOLO después de
// que el pago ya fue confirmado (dentro del webhook de Mercado Pago). Si
// NubeFacT falla, no se relanza el error: el pedido ya está pagado y
// creado, la emisión queda en estado_sunat='PENDIENTE' para reintentar
// después (ver nubefact.service.js).
async function emitirComprobante(id_pedido, comprobante, datosComprobante, datosEnvio) {
    try {
        const pedidoCompleto = await pedidoModel.obtenerPedidoCompleto(id_pedido);

        const payload = nubefactService.construirPayload({
            pedido: pedidoCompleto,
            cliente: {
                tipo_documento: datosComprobante.tipo === 'factura' ? 'RUC' : 'DNI',
                numero_documento: datosComprobante.tipo === 'factura' ? datosComprobante.ruc : datosComprobante.dni,
                nombre_completo: datosComprobante.nombre,
                razon_social: datosComprobante.razon_social,
                direccion: datosComprobante.direccion_fiscal,
                correo: pedidoCompleto.cliente_correo
            },
            detalles: pedidoCompleto.detalles,
            tipoComprobante: datosComprobante.tipo === 'factura' ? 'FACTURA' : 'BOLETA',
            serie: comprobante.serie,
            numero: comprobante.numero,
            costoEnvio: datosEnvio ? datosEnvio.costo_envio : pedidoCompleto.costo_envio
        });

        // Guardar los montos ya calculados (subtotal sin IGV / IGV / total)
        // en las columnas que tu tabla `comprobante` ya tiene para esto.
        await pedidoModel.actualizarMontosComprobante(comprobante.id, {
            subtotal: payload.total_gravada,
            igv:      payload.total_igv,
            total:    payload.total
        });

        const resultado = await nubefactService.generarComprobante(payload);

        await pedidoModel.actualizarEstadoSunat(comprobante.id, {
            estado_sunat:       resultado.aceptada_por_sunat ? 'ACEPTADO' : 'OBSERVADO',
            archivo_pdf:        resultado.enlace_del_pdf,
            xml_cpe_url:        resultado.enlace_del_xml,
            cdr_sunat_url:       resultado.enlace_del_cdr,
            hash_cpe:            resultado.codigo_hash,
            sunat_description:  resultado.sunat_description
        });

        return resultado;
    } catch (errNubefact) {
        console.error('NubeFacT no pudo emitir el comprobante (queda PENDIENTE):', errNubefact.message);
        return null;
    }
}

// ── Único flujo de pago del sistema: Mercado Pago (Checkout Pro) ──
//
// 1) Se crea el pedido en estado PENDIENTE + su comprobante (con los datos
//    de facturación ya guardados).
// 2) Se crea una preferencia en Mercado Pago y se devuelve la URL a la
//    que el frontend debe redirigir al cliente.
// 3) El pago solo se confirma cuando Mercado Pago llama al webhook
//    (webhookMercadoPago) — nunca al volver del navegador. Recién ahí el
//    pedido pasa a PAGADO y se emite el comprobante ante SUNAT.
exports.crearPedidoConMercadoPago = async (req, res) => {
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

        const { carrito, datosEnvio, datosComprobante } = req.body;

        if (!carrito || !carrito.length || !datosEnvio || !datosComprobante) {
            return res.status(400).json({ mensaje: 'Faltan datos del pedido' });
        }

        const id_tipo_comprobante = datosComprobante.tipo === 'factura' ? 2 : 1;

        // 1) Crear el pedido (queda PENDIENTE hasta que llegue el webhook)
        const id_pedido = await pedidoModel.crearPedido({
            id_cliente,
            id_distrito:         datosEnvio.id_distrito,       // null si es recojo en tienda
            id_zona:              datosEnvio.id_zona,           // null si es recojo en tienda
            id_tipo_comprobante,
            total:                datosEnvio.total,
            costo_envio:          datosEnvio.costo_envio,
            direccion_entrega:    datosEnvio.direccion_completa,
            tipo_entrega:         datosEnvio.tipo_entrega
        });

        await pedidoModel.crearDetallePedido(id_pedido, carrito);
        await pedidoModel.crearComprobante(id_pedido, datosComprobante.tipo, datosComprobante);

        // 2) Crear la preferencia en Mercado Pago
        const urlBase = process.env.SITE_URL;
        if (!urlBase) {
            return res.status(500).json({ mensaje: 'Falta configurar SITE_URL en el servidor' });
        }

        let preferencia;
        try {
            preferencia = await mpService.crearPreferencia({
                idPedidoTemporal: id_pedido,
                items: carrito,
                costoEnvio: datosEnvio.costo_envio,
                emailComprador: req.usuario?.correo,
                urlBase
            });
        } catch (errMp) {
            if (errMp.configuracion) {
                return res.status(503).json({ mensaje: 'El pago con Mercado Pago no está disponible en este momento' });
            }
            throw errMp;
        }

        res.status(201).json({
            id_pedido,
            init_point:         preferencia.init_point,          // producción
            sandbox_init_point: preferencia.sandbox_init_point   // pruebas (credenciales de test)
        });

    } catch (err) {
        if (err.stockInsuficiente) {
            return res.status(409).json({ mensaje: err.message });
        }
        responder.error(res, 500, 'Error al iniciar el pago con Mercado Pago', err, 'Error al crear pedido con Mercado Pago:');
    }
};

// Webhook / IPN: Mercado Pago llama a esta URL cuando el estado de un
// pago cambia. Es la ÚNICA fuente de verdad sobre si un pedido fue
// pagado — nunca se confía en la redirección del navegador.
exports.webhookMercadoPago = async (req, res) => {
    // Responder rápido: Mercado Pago reintenta la notificación si no
    // contestamos 200 pronto.
    res.sendStatus(200);

    try {
        const { type, data } = req.body || {};
        if (type !== 'payment' || !data?.id) return;

        const pago = await mpService.obtenerPago(data.id);
        const id_pedido = Number(pago.external_reference);
        if (!id_pedido) return;

        const [pedidoRows] = await db.query('SELECT * FROM pedido WHERE id_pedido = ?', [id_pedido]);
        if (!pedidoRows.length) return;
        const pedido = pedidoRows[0];

        // Evitar procesar dos veces si Mercado Pago reenvía la notificación
        if (pedido.estado === 'PAGADO' && pago.status === 'approved') return;

        if (pago.status === 'approved') {
            await db.query("UPDATE pedido SET estado = 'PAGADO' WHERE id_pedido = ?", [id_pedido]);

            // Tu tabla tipo_pago ya trae: 1 = 'Billetera digital', 2 = 'Tarjeta'.
            // Mercado Pago informa el medio real en payment_type_id
            // ('credit_card' | 'debit_card' | 'account_money' | 'digital_wallet'
            // | 'ticket' | ...). Lo mapeamos al tipo_pago que ya existe, y
            // guardamos el detalle exacto en pasarela + respuesta_pasarela.
            const esTarjeta = ['credit_card', 'debit_card'].includes(pago.payment_type_id);
            const id_tipo_pago = esTarjeta ? 2 : 1;

            await pedidoModel.crearPago(
                id_pedido, id_tipo_pago, pago.transaction_amount, String(pago.id),
                'MERCADOPAGO', pago
            );

            const [compRows] = await db.query(
                'SELECT id_comprobante, serie, numero, tipo, ruc_cliente, razon_social, direccion_fiscal, dni_cliente, nombre_cliente FROM comprobante WHERE id_pedido = ?',
                [id_pedido]
            );
            const comprobanteRow = compRows[0];

            if (comprobanteRow) {
                const datosComprobante = comprobanteRow.tipo === 'FACTURA'
                    ? { tipo: 'factura', ruc: comprobanteRow.ruc_cliente, razon_social: comprobanteRow.razon_social, direccion_fiscal: comprobanteRow.direccion_fiscal }
                    : { tipo: 'boleta', dni: comprobanteRow.dni_cliente, nombre: comprobanteRow.nombre_cliente };

                const comprobante = { id: comprobanteRow.id_comprobante, serie: comprobanteRow.serie, numero: comprobanteRow.numero };

                await emitirComprobante(id_pedido, comprobante, datosComprobante, { costo_envio: pedido.costo_envio });
            }

        } else if (pago.status === 'rejected') {
            await db.query("UPDATE pedido SET estado = 'CANCELADO' WHERE id_pedido = ?", [id_pedido]);
        }
        // 'in_process' / 'pending' -> no hacer nada, esperar el próximo webhook

    } catch (err) {
        console.error('Error en webhook de Mercado Pago:', err);
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

        const [pedidoRows] = await db.query(`
            SELECT p.*, per.nombres AS cliente_nombre, per.correo AS cliente_correo,
                   d.nombre AS nombre_distrito, tc.nombre AS tipo_comprobante
            FROM pedido p
            JOIN cliente c ON p.id_cliente = c.id_cliente
            JOIN persona per ON c.id_persona = per.id_persona
            LEFT JOIN distrito d ON p.id_distrito = d.id_distrito
            LEFT JOIN tipo_comprobante tc ON p.id_tipo_comprobante = tc.id_tipo_comprobante
            WHERE p.id_pedido = ? AND p.id_cliente = ?
        `, [req.params.id, id_cliente]);
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

        const [compRows] = await db.query(`
            SELECT id_comprobante, serie, numero, tipo, fecha_emision,
                   ruc_cliente, razon_social, direccion_fiscal, dni_cliente, nombre_cliente,
                   subtotal, igv, total, estado_sunat, archivo_pdf
            FROM comprobante WHERE id_pedido = ?
        `, [req.params.id]);

        res.json({ ...pedido, detalles: detallesConMarca, comprobante: compRows[0] || null });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'Error al obtener detalle del pedido' });
    }
};
