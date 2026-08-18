async function procesarPago() {
    // Obtener todos los datos guardados
    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const datosEnvio = JSON.parse(localStorage.getItem('datosEnvio'));
    const datosComprobante = JSON.parse(localStorage.getItem('datosComprobante'));
    const token = localStorage.getItem('token');

    if (!datosEnvio || !datosComprobante || carrito.length === 0) {
        alert('Faltan datos del pedido');
        window.location.href = '/';
        return;
    }

    // Mostrar loading
    const btn = document.getElementById('btn-pagar');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Redirigiendo a Mercado Pago...';

    try {
        const response = await fetch('/api/pedidos/crear-con-mercadopago', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ carrito, datosEnvio, datosComprobante })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.mensaje || 'Error al iniciar el pago');
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-lock me-2"></i>Pagar con Mercado Pago';
            return;
        }

        // NO se limpia el carrito/localStorage aquí: eso pasa recién en
        // confirmacion.html, y solo porque Mercado Pago te redirige ahí
        // (back_urls.success) cuando el pago fue aprobado de verdad.
        window.location.href = data.init_point || data.sandbox_init_point;

    } catch (err) {
        console.error(err);
        alert('Error al conectar con el servidor');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-lock me-2"></i>Pagar con Mercado Pago';
    }
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
    document.getElementById('resumen-envio').innerText = 'S/. ' + (datosEnvio.costo_envio || 0).toFixed(2);
    document.getElementById('resumen-total').innerText = 'S/. ' + datosEnvio.total.toFixed(2);
}

// Si Mercado Pago redirige de vuelta con un pago fallido o pendiente
// (back_urls.failure / pending), avisar al cliente.
function mostrarEstadoRetorno() {
    const params = new URLSearchParams(window.location.search);
    const estado = params.get('estado');
    if (!estado) return;
    const mensajes = {
        fallido: 'El pago no pudo completarse. Puedes intentarlo nuevamente.',
        pendiente: 'Tu pago está pendiente de confirmación. Te avisaremos cuando se apruebe.'
    };
    if (mensajes[estado]) alert(mensajes[estado]);
}

window.addEventListener('DOMContentLoaded', () => {
    cargarResumen();
    mostrarEstadoRetorno();
});
