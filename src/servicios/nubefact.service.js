// ════════════════════════════════════════════════════════════
// Integración con NubeFacT — PSE (Proveedor de Servicios Electrónicos)
// para emitir boletas/facturas electrónicas ante SUNAT.
//
// Manual de integración (JSON): https://www.nubefact.com/integracion
//
// IMPORTANTE — verificar con tu cuenta real antes de producción:
// Este servicio usa el esquema JSON estándar y ampliamente documentado
// de NubeFacT (operacion/tipo_de_comprobante/items/...), pero no pude
// probarlo contra la API real desde este entorno (sin salida de red a
// nubefact.com). Antes de usarlo en producción, haz una prueba manual
// con tu cuenta y revisa el manual PDF que te dieron al crear la
// cuenta por si tu plan usa algún campo adicional.
//
// Variables de entorno requeridas:
//   NUBEFACT_RUTA  -> URL única de tu cuenta (te la da NubeFacT al
//                     crear la cuenta, ej. https://api.nubefact.com/api/v1/TU_ID)
//   NUBEFACT_TOKEN -> tu token de autenticación
// ════════════════════════════════════════════════════════════

const IGV = 0.18; // Perú: 18%, incluido en el precio de venta (no se suma aparte)

// Llama a la API de NubeFacT para generar el comprobante electrónico.
async function generarComprobante(payload) {
    if (!process.env.NUBEFACT_RUTA || !process.env.NUBEFACT_TOKEN) {
        const err = new Error('NUBEFACT_RUTA / NUBEFACT_TOKEN no configuradas en el servidor');
        err.configuracion = true;
        throw err;
    }

    const res = await fetch(process.env.NUBEFACT_RUTA, {
        method: 'POST',
        headers: {
            'Authorization': 'Token token="' + process.env.NUBEFACT_TOKEN + '"',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || data.errors) {
        const err = new Error(typeof data.errors === 'string' ? data.errors : 'NubeFacT rechazó el comprobante');
        err.nubefact = data;
        throw err;
    }

    return data;
    // Respuesta esperada (según el manual): incluye enlace_del_pdf,
    // enlace_del_xml, enlace_del_cdr, aceptada_por_sunat,
    // sunat_description, codigo_hash, entre otros.
}

// Arma el payload de NubeFacT (boleta o factura) a partir de los datos
// ya calculados de un pedido. No llama a la API, solo construye el JSON.
//
// tipoComprobante: 'FACTURA' | 'BOLETA'
// cliente: { tipo_documento, numero_documento, nombre_completo, razon_social, direccion, correo }
// detalles: filas de detalle_pedido con producto_nombre incluido
function construirPayload({ pedido, cliente, detalles, tipoComprobante, serie, numero, costoEnvio }) {
    const items = detalles.map(d => {
        const precioUnitConIgv = Number(d.precio_unitario);
        const valorUnitario    = precioUnitConIgv / (1 + IGV);
        const subtotalSinIgv   = (Number(d.subtotal) / (1 + IGV));
        const igvItem          = Number(d.subtotal) - subtotalSinIgv;

        return {
            unidad_de_medida: 'NIU',
            codigo:           String(d.id_producto),
            descripcion:      d.producto_nombre,
            cantidad:         Number(d.cantidad),
            valor_unitario:   Number(valorUnitario.toFixed(2)),
            precio_unitario:  Number(precioUnitConIgv.toFixed(2)),
            subtotal:         Number(subtotalSinIgv.toFixed(2)),
            tipo_de_igv:      1, // 1 = Gravado - Operación Onerosa
            igv:              Number(igvItem.toFixed(2)),
            total:            Number(Number(d.subtotal).toFixed(2))
        };
    });

    // El envío se factura como un ítem más (con su propio IGV), así el
    // total del comprobante cuadra exacto con pedido.total. Si no hay
    // costo de envío (recojo en tienda, etc.) simplemente no se agrega.
    if (costoEnvio && Number(costoEnvio) > 0) {
        const envioConIgv  = Number(costoEnvio);
        const envioSinIgv   = envioConIgv / (1 + IGV);
        items.push({
            unidad_de_medida: 'ZZ', // "Servicio" según catálogo SUNAT
            codigo:           'ENVIO',
            descripcion:      'Costo de envío',
            cantidad:         1,
            valor_unitario:   Number(envioSinIgv.toFixed(2)),
            precio_unitario:  Number(envioConIgv.toFixed(2)),
            subtotal:         Number(envioSinIgv.toFixed(2)),
            tipo_de_igv:      1,
            igv:              Number((envioConIgv - envioSinIgv).toFixed(2)),
            total:            Number(envioConIgv.toFixed(2))
        });
    }

    const totalGravada = items.reduce((s, i) => s + i.subtotal, 0);
    const totalIgvSuma = items.reduce((s, i) => s + i.igv, 0);

    const esFactura = tipoComprobante === 'FACTURA';
    const hoy = new Date();
    const fechaEmision = String(hoy.getDate()).padStart(2, '0') + '-' +
                          String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
                          hoy.getFullYear();

    return {
        operacion: 'generar_comprobante',
        tipo_de_comprobante: esFactura ? 1 : 2, // 1 = Factura, 2 = Boleta
        serie,
        numero,
        sunat_transaction: 1, // Venta interna
        cliente_tipo_de_documento: esFactura ? 6 : (cliente.tipo_documento === 'RUC' ? 6 : 1), // 6=RUC, 1=DNI
        cliente_numero_de_documento: cliente.numero_documento,
        cliente_denominacion: esFactura ? cliente.razon_social : cliente.nombre_completo,
        cliente_direccion: cliente.direccion || '-',
        cliente_email: cliente.correo || '',
        fecha_de_emision: fechaEmision,
        moneda: 1, // 1 = Soles
        porcentaje_de_igv: 18.00,
        total_gravada: Number(totalGravada.toFixed(2)),
        total_igv:     Number(totalIgvSuma.toFixed(2)),
        total:         Number(Number(pedido.total).toFixed(2)),
        enviar_automaticamente_a_la_sunat: true,
        enviar_automaticamente_al_cliente: false,
        items
    };
}

module.exports = { generarComprobante, construirPayload, esProduccion };

// true solo si explícitamente se configuró NUBEFACT_ENVIRONMENT=produccion.
// Por defecto (var vacía o "demo") se asume DEMO — más seguro: si alguien
// olvida configurar la variable, el sistema avisa "modo demo" en vez de
// aparentar que un comprobante es válido ante SUNAT sin serlo.
function esProduccion() {
    return (process.env.NUBEFACT_ENVIRONMENT || 'demo').toLowerCase() === 'produccion';
}
