// ════════════════════════════════════════════════════════════
// Integración con Mercado Pago — Checkout Pro.
// El cliente es redirigido a una página hospedada por Mercado Pago
// para pagar (tarjeta, Yape, Plin, cuenta MP). Los datos de pago NUNCA
// tocan nuestro servidor (cumplimiento PCI-DSS lo maneja Mercado Pago).
// Documentación: https://www.mercadopago.com.pe/developers/es/docs/checkout-pro
//
// Variables de entorno requeridas:
//   MP_ACCESS_TOKEN -> llave SECRETA de tu aplicación (nunca al navegador)
//   MP_PUBLIC_KEY   -> llave pública (se expone vía /api/config, es segura)
//   SITE_URL        -> URL pública de tu sitio (ya la usas para Brevo),
//                      se reutiliza para las back_urls y el webhook.
// ════════════════════════════════════════════════════════════
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

function getClient() {
    if (!process.env.MP_ACCESS_TOKEN) {
        const err = new Error('MP_ACCESS_TOKEN no configurado en el servidor');
        err.configuracion = true;
        throw err;
    }
    return new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
}

// Crea una "preferencia de pago": el registro que Mercado Pago usa para
// saber qué se está cobrando. Devuelve init_point (producción) y
// sandbox_init_point (pruebas) — URLs a las que se redirige al cliente.
async function crearPreferencia({ idPedidoTemporal, items, costoEnvio, emailComprador, urlBase }) {
    const client = getClient();
    const preference = new Preference(client);

    const itemsMp = items.map(i => ({
        title: i.nombre,
        quantity: Number(i.cantidad),
        unit_price: Number(i.precio),
        currency_id: 'PEN'
    }));

    if (costoEnvio && Number(costoEnvio) > 0) {
        itemsMp.push({ title: 'Costo de envío', quantity: 1, unit_price: Number(costoEnvio), currency_id: 'PEN' });
    }

    const respuesta = await preference.create({
        body: {
            items: itemsMp,
            payer: emailComprador ? { email: emailComprador } : undefined,
            // external_reference es CLAVE: así el webhook sabe a qué pedido
            // pendiente corresponde el pago que llega después.
            external_reference: String(idPedidoTemporal),
            back_urls: {
                success: `${urlBase}/confirmacion.html?id_pedido=${idPedidoTemporal}`,
                failure: `${urlBase}/pago.html?estado=fallido`,
                pending: `${urlBase}/pago.html?estado=pendiente`
            },
            auto_return: 'approved',
            notification_url: `${urlBase}/api/pedidos/mercadopago/webhook`
        }
    });

    return respuesta;
}

// Consulta el estado real de un pago (se usa dentro del webhook: nunca
// confiamos en los datos que manda la notificación por sí solos).
async function obtenerPago(idPago) {
    const client = getClient();
    const payment = new Payment(client);
    return payment.get({ id: idPago });
}

module.exports = { crearPreferencia, obtenerPago };
