let metodoSeleccionado = null;
let culqiPublicKey = null;

// La llave PÚBLICA de Culqi se pide al backend (que la lee de su .env)
// en vez de venir hardcodeada acá — así configurar el pago es solo
// cuestión de variables de entorno, sin tocar este archivo.
async function cargarConfigCulqi() {
    try {
        const res = await fetch('/api/config');
        const data = await res.json();
        culqiPublicKey = data.culqi_public_key;
    } catch (err) {
        console.error('No se pudo cargar la configuración de pagos:', err);
    }
}

function seleccionarMetodo(metodo) {
    metodoSeleccionado = metodo;

    document.getElementById('card-yape').classList.remove('seleccionado');
    document.getElementById('card-tarjeta').classList.remove('seleccionado');
    document.getElementById('form-yape').classList.add('d-none');
    document.getElementById('form-tarjeta').classList.add('d-none');
    document.getElementById('mensaje-metodo').classList.add('d-none');

    if (metodo === 'yape') {
        document.getElementById('card-yape').classList.add('seleccionado');
        document.getElementById('form-yape').classList.remove('d-none');
    } else {
        document.getElementById('card-tarjeta').classList.add('seleccionado');
        document.getElementById('form-tarjeta').classList.remove('d-none');
    }
}

// ═══════════════════════════════════════════════════
//  CULQI — pago con tarjeta
// ═══════════════════════════════════════════════════

// Nombre de función FIJO: CulqiJS busca exactamente window.culqi()
// como callback cuando el widget termina de tokenizar la tarjeta.
// No renombrar esta función.
function culqi() {
    if (Culqi.token) {
        finalizarCompraConToken(Culqi.token.id);
    } else if (Culqi.error) {
        console.error('Error Culqi:', Culqi.error);
        alert((Culqi.error && Culqi.error.user_message) || 'No se pudo procesar la tarjeta. Verifica los datos.');
        restaurarBotonPago();
    }
}

function abrirCheckoutTarjeta() {
    if (!culqiPublicKey) {
        alert('El pago con tarjeta no está disponible en este momento. Usa Yape.');
        return;
    }

    const datosEnvio = JSON.parse(localStorage.getItem('datosEnvio'));
    if (!datosEnvio) { alert('Faltan datos del pedido'); return; }

    Culqi.publicKey = culqiPublicKey;
    Culqi.settings({
        title: 'AgroVeterinaria ALIVET',
        currency: 'PEN',
        amount: Math.round(datosEnvio.total * 100) // Culqi trabaja en céntimos
    });
    Culqi.options({
        lang: 'auto',
        installments: false,
        paymentMethods: {
            tarjeta: true, yape: false, bancaMovil: false,
            agente: false, billetera: false, cuotealo: false
        }
    });
    Culqi.open();
}

async function finalizarCompraConToken(tokenId) {
    await enviarPedido({ metodoPago: 'culqi', culqiTokenId: tokenId });
}

// ═══════════════════════════════════════════════════
//  ENVÍO DEL PEDIDO (común a Yape y Culqi)
// ═══════════════════════════════════════════════════

async function procesarPago() {
    if (!metodoSeleccionado) {
        document.getElementById('mensaje-metodo').classList.remove('d-none');
        return;
    }

    if (metodoSeleccionado === 'tarjeta') {
        // El flujo continúa en culqi() de arriba cuando el cliente termine
        // de llenar el widget; acá solo lo abrimos.
        abrirCheckoutTarjeta();
        return;
    }

    // Yape
    const codigoTransaccion = document.getElementById('codigo-yape').value.trim();
    if (!/^\d{6,}$/.test(codigoTransaccion)) {
        alert('Ingresa un número de operación Yape válido (solo dígitos, mínimo 6).');
        return;
    }
    await enviarPedido({ metodoPago: 'yape', codigoTransaccion });
}

async function enviarPedido(datosPago) {
    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const datosEnvio = JSON.parse(localStorage.getItem('datosEnvio'));
    const datosComprobante = JSON.parse(localStorage.getItem('datosComprobante'));
    const token = localStorage.getItem('token');

    if (!datosEnvio || !datosComprobante || carrito.length === 0) {
        alert('Faltan datos del pedido');
        window.location.href = '/';
        return;
    }

    mostrarCargandoBoton();

    try {
        const pedidoData = { carrito, datosEnvio, datosComprobante, ...datosPago };

        const response = await fetch('/api/pedidos/crear', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(pedidoData)
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.mensaje || 'Error al procesar el pago');
            restaurarBotonPago();
            return;
        }

        localStorage.setItem('ultimoPedido', JSON.stringify(data));
        localStorage.removeItem('carrito');
        localStorage.removeItem('datosEnvio');
        localStorage.removeItem('datosComprobante');

        window.location.href = '/confirmacion.html';

    } catch (err) {
        console.error(err);
        alert('Error al conectar con el servidor');
        restaurarBotonPago();
    }
}

function mostrarCargandoBoton() {
    const btn = document.getElementById('btn-pagar');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...';
}

function restaurarBotonPago() {
    const btn = document.getElementById('btn-pagar');
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-lock me-2"></i>Confirmar Pago';
}

function cargarResumen() {
    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const datosEnvio = JSON.parse(localStorage.getItem('datosEnvio'));

    if (!datosEnvio || carrito.length === 0) {
        window.location.href = '/';
        return;
    }

    let subtotal = 0;
    const container = document.getElementById('resumen-items');

    container.innerHTML = carrito.map(item => {
        const itemSubtotal = item.precio * item.cantidad;
        subtotal += itemSubtotal;
        return `
        <div class="d-flex justify-content-between mb-2">
            <span>${item.nombre} x${item.cantidad}</span>
            <span class="text-success fw-bold">S/. ${itemSubtotal.toFixed(2)}</span>
        </div>`;
    }).join('');

    document.getElementById('resumen-subtotal').innerText = 'S/. ' + subtotal.toFixed(2);
    document.getElementById('resumen-envio').innerText = 'S/. ' + datosEnvio.costo_envio.toFixed(2);
    document.getElementById('resumen-total').innerText = 'S/. ' + datosEnvio.total.toFixed(2);
}

window.addEventListener('DOMContentLoaded', () => {
    cargarResumen();
    cargarConfigCulqi();
});

// ═══════════════════════════════════════════════════
//  DESPACHADOR DE EVENTOS (mismo patrón que dashboard.js/index.js)
// ═══════════════════════════════════════════════════
document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-accion]');
    if (!el) return;

    switch (el.dataset.accion) {
        case 'seleccionar-metodo': seleccionarMetodo(el.dataset.valor); break;
        case 'procesar-pago':      procesarPago(); break;
        case 'volver':              window.location.href = '/comprobante.html'; break;
    }
});
