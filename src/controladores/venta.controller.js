const Venta = require('../modelos/venta.model');

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const ERR_DEP = 'Dependencia faltante. Ejecuta "npm install exceljs" y reinicia el servidor.';

function cargarDependencia(nombre) {
    try { return require(nombre); }
    catch (e) { return null; }
}

// Fecha de HOY en hora de Perú (America/Lima, UTC-5 fijo, sin horario
// de verano) en 'YYYY-MM-DD' — mismo criterio que public/js/ventas.js
// (fechaHoyPeru), pero acá del lado del servidor: no depende de qué
// hora tenga puesta el reloj de quien llama a la API directamente
// (ej. con Postman), es siempre la hora real de Perú.
function fechaHoyPeru() {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
}

// Respaldo del lado del servidor de la misma validación que ya hace
// ventas.js en el navegador — por si alguien llama a la API directo
// (sin pasar por la web) con un rango de fechas inválido.
function validarRangoFechas(query, res) {
    const hoy = fechaHoyPeru();
    const { desde, hasta } = query;
    if (desde && desde > hoy) {
        res.status(400).json({ mensaje: `La fecha "desde" no puede ser posterior a hoy (${hoy}).` });
        return false;
    }
    if (hasta && hasta > hoy) {
        res.status(400).json({ mensaje: `La fecha "hasta" no puede ser posterior a hoy (${hoy}).` });
        return false;
    }
    if (desde && hasta && desde > hasta) {
        res.status(400).json({ mensaje: 'La fecha "desde" no puede ser posterior a la fecha "hasta".' });
        return false;
    }
    return true;
}

// Calcula subtotal (op. gravada) e IGV asumiendo precios con IGV incluido (18%)
function calcularTotales(totalConIgv) {
    const total     = Number(totalConIgv) || 0;
    const subtotal  = +(total / 1.18).toFixed(2);
    const igv       = +(total - subtotal).toFixed(2);
    return { subtotal, igv, total };
}

// ── GET /api/ventas ──
exports.listar = async (req, res) => {
    try {
        if (!validarRangoFechas(req.query, res)) return;
        const resultado = await Venta.listarVentas(req.query);
        res.json(resultado);
    } catch (err) {
        console.error('Error al listar ventas:', err);
        res.status(500).json({ mensaje: 'Error al obtener ventas' });
    }
};

// ── GET /api/ventas/:idPedido ──
exports.detalle = async (req, res) => {
    try {
        const cab = await Venta.obtenerComprobante(req.params.idPedido);
        if (!cab) return res.status(404).json({ mensaje: 'Venta no encontrada' });

        const productos = await Venta.obtenerDetalleProductos(req.params.idPedido);
        const esFactura = (cab.tipo || '').toUpperCase() === 'FACTURA' || !!cab.ruc_cliente;

        // Totales: usa los del comprobante si existen, si no los calcula desde el total del pedido
        let totales;
        if (cab.subtotal != null && cab.igv != null && cab.total_comprobante != null) {
            totales = { subtotal: Number(cab.subtotal), igv: Number(cab.igv), total: Number(cab.total_comprobante) };
        } else {
            totales = calcularTotales(cab.total_pedido);
        }

        const documento = cab.ruc_cliente ? 'RUC: ' + cab.ruc_cliente
                        : cab.dni_cliente ? 'DNI: ' + cab.dni_cliente
                        : '';

        res.json({
            comprobante: {
                id_pedido:   cab.id_pedido,
                numero:      `${cab.serie || ''}-${cab.numero || ''}`,
                tipo:        (cab.tipo || 'BOLETA').toUpperCase(),
                fecha:       cab.fecha_emision || cab.fecha_pedido,
                cliente:     cab.razon_social || cab.nombre_cliente || cab.cliente_persona || '—',
                documento,
                esFactura,
                estado:      cab.estado,
                costo_envio: Number(cab.costo_envio) || 0,
                // Tal cual vienen de la tabla pedido — 'DELIVERY' o
                // 'RECOJO_TIENDA'. direccion_entrega ya trae, cuando es
                // recojo en tienda, el texto fijo "Recojo en tienda —
                // ALIVET (...)" que arma el checkout.
                tipo_entrega:       cab.tipo_entrega || 'DELIVERY',
                direccion_entrega:  cab.direccion_entrega || '',
                // Foto de evidencia de cancelación (repartidor no pudo
                // entregar, cliente rechazó el producto, etc.) — null
                // si el pedido nunca se canceló con evidencia.
                evidencia_url:      cab.evidencia_url || null,
                // Persona real de contacto (no la razón social de la
                // factura) — quien recibe/recoge el pedido físicamente.
                // Persona real de contacto. Si el pedido es de un
                // cliente registrado, se usa su nombre real
                // (cliente_persona). Si fue una compra como invitado
                // (sin cuenta), no hay persona que unir — se usa
                // entonces el nombre que se escribió en el comprobante,
                // en vez de dejarlo vacío.
                contacto_nombre:    cab.cliente_persona || cab.nombre_cliente || cab.razon_social || '',
                contacto_telefono:  cab.cliente_telefono || '',
                // Nota de dirección guardada por el cliente (ej. "casa
                // azul, al lado del grifo") — solo aplica a Delivery.
                referencia:         cab.referencia_habitual || ''
            },
            productos: productos.map(p => ({
                producto:        p.producto,
                cantidad:        p.cantidad,
                precio_unitario: Number(p.precio_unitario),
                subtotal:        Number(p.subtotal),
                color:           p.color || '',
                talla:           p.talla || ''
            })),
            totales
        });
    } catch (err) {
        console.error('Error al obtener detalle de venta:', err);
        res.status(500).json({ mensaje: 'Error al obtener el detalle' });
    }
};

// ── GET /api/ventas/exportar-excel ──
exports.exportarExcel = async (req, res) => {
    const ExcelJS = cargarDependencia('exceljs');
    if (!ExcelJS) return res.status(503).json({ mensaje: ERR_DEP });
    try {
        if (!validarRangoFechas(req.query, res)) return;
        const ventas = await Venta.listarVentasParaExportar(req.query);

        const wb = new ExcelJS.Workbook();
        wb.creator = 'AgroVeterinaria ALIVET';
        const ws = wb.addWorksheet('Ventas');

        ws.columns = [
            { header: 'N° Comprobante', key: 'comprobante',  width: 18 },
            { header: 'Fecha',          key: 'fecha',         width: 20 },
            { header: 'Cliente',        key: 'cliente',       width: 30 },
            { header: 'Tipo',           key: 'tipo',          width: 12 },
            { header: 'Total',          key: 'total',         width: 14 },
            { header: 'Método de Pago', key: 'metodo_pago',   width: 18 },
            { header: 'Estado',         key: 'estado',        width: 14 }
        ];
        // Cabecera: negrita, fondo verde, letra blanca
        const h = ws.getRow(1);
        h.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
        h.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF06A049' } };
        h.alignment = { vertical: 'middle', horizontal: 'center' };
        h.height    = 20;
        ws.autoFilter = 'A1:G1';
        ws.views = [{ state: 'frozen', ySplit: 1 }];

        ventas.forEach(v => ws.addRow({
            comprobante: v.comprobante,
            fecha:       new Date(v.fecha).toLocaleString('es-PE'),
            cliente:     v.cliente,
            tipo:        v.tipo,
            total:       Number(v.total),
            metodo_pago: v.metodo_pago,
            estado:      v.estado
        }));
        ws.getColumn('total').numFmt = '"S/. "#,##0.00';

        res.setHeader('Content-Type', XLSX_MIME);
        res.setHeader('Content-Disposition', 'attachment; filename="ventas.xlsx"');
        await wb.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Error al exportar ventas:', err);
        if (!res.headersSent) res.status(500).json({ mensaje: 'Error al generar el Excel' });
    }
};
