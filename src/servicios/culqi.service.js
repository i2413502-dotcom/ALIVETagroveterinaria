// ════════════════════════════════════════════════════════════
// Integración con Culqi — pasarela de pagos con tarjeta.
// Documentación oficial: https://apidocs.culqi.com/
//
// FLUJO DE SEGURIDAD (importante, no cambiar):
// El número de tarjeta NUNCA debe tocar nuestro servidor (cumplimiento
// PCI-DSS). El frontend usa CulqiJS para tokenizar la tarjeta
// directamente contra los servidores de Culqi y nos entrega solo un
// "token_id" (ej. tkn_test_xxx) de un solo uso. Aquí, con la LLAVE
// SECRETA (nunca expuesta al navegador), cobramos ese token.
// ════════════════════════════════════════════════════════════

const CULQI_CHARGES_URL = 'https://api.culqi.com/v2/charges';

// Crea un cargo (cobro) a partir de un token generado en el frontend.
// montoSoles: monto en SOLES (con decimales); Culqi trabaja en céntimos,
// la conversión se hace acá para que el resto del sistema siga
// manejando soles como en todas las demás tablas.
async function crearCargo({ tokenId, montoSoles, email, descripcion, metadata }) {
    if (!process.env.CULQI_SECRET_KEY) {
        const err = new Error('CULQI_SECRET_KEY no configurada en el servidor');
        err.configuracion = true;
        throw err;
    }
    if (!tokenId) throw new Error('Falta el token de la tarjeta (tokenId)');

    const body = {
        amount: Math.round(montoSoles * 100), // Culqi exige céntimos, enteros
        currency_code: 'PEN',
        email,
        source_id: tokenId,
        description: descripcion || 'Compra AgroVeterinaria ALIVET',
        capture: true,
        installments: 0,
        metadata: metadata || {}
    };

    const res = await fetch(CULQI_CHARGES_URL, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + process.env.CULQI_SECRET_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
        // Culqi devuelve { object:"error", type, user_message, merchant_message }
        // user_message ya viene en español y listo para mostrar al cliente.
        const err = new Error(data.user_message || data.merchant_message || 'El banco rechazó el pago');
        err.culqi = data;
        throw err;
    }

    return data; // { object:"charge", id:"chr_...", outcome:{...}, amount, ... }
}

module.exports = { crearCargo };
