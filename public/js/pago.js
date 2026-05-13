let metodoSeleccionado = null;

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

function formatearTarjeta(input) {
    let valor = input.value.replace(/\D/g, '');
    valor = valor.match(/.{1,4}/g)?.join(' ') || valor;
    input.value = valor;
}

function formatearVencimiento(input) {
    let valor = input.value.replace(/\D/g, '');
    if (valor.length >= 2) valor = valor.slice(0,2) + '/' + valor.slice(2);
    input.value = valor;
}

async function procesarPago() {
    if (!metodoSeleccionado) {
        document.getElementById('mensaje-metodo').classList.remove('d-none');
        return;
    }

    let codigoTransaccion = '';

    if (metodoSeleccionado === 'yape') {
        codigoTransaccion = document.getElementById('codigo-yape').value.trim();
        if (!codigoTransaccion) {
            alert('Ingresa el número de operación Yape');
            return;
        }
    } else {
        const numero = document.getElementById('numero-tarjeta').value.trim();
        const nombre = document.getElementById('nombre-tarjeta').value.trim();
        const venc = document.getElementById('vencimiento').value.trim();
        const cvv = document.getElementById('cvv').value.trim();

        if (!numero || !nombre || !venc || !cvv) {
            alert('Por favor completa todos los datos de la tarjeta');
            return;
        }
        codigoTransaccion = 'TARJ-' + Date.now();
    }

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
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Procesando...';

    try {
        const pedidoData = {
            carrito,
            datosEnvio,
            datosComprobante,
            metodoPago: metodoSeleccionado,
            codigoTransaccion
        };

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
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-lock me-2"></i>Confirmar Pago';
            return;
        }

        // Guardar id del pedido para confirmación
        localStorage.setItem('ultimoPedido', JSON.stringify(data));

        // Limpiar carrito
        localStorage.removeItem('carrito');
        localStorage.removeItem('datosEnvio');
        localStorage.removeItem('datosComprobante');

        window.location.href = '/confirmacion.html';

    } catch (err) {
        console.error(err);
        alert('Error al conectar con el servidor');
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-lock me-2"></i>Confirmar Pago';
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
    document.getElementById('resumen-envio').innerText = 'S/. ' + datosEnvio.costo_envio.toFixed(2);
    document.getElementById('resumen-total').innerText = 'S/. ' + datosEnvio.total.toFixed(2);
}

window.addEventListener('DOMContentLoaded', cargarResumen);