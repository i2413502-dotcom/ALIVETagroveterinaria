// Datos del emisor — datos reales de AGROVETERINARIA ALIVET S.A.C.
const EMISOR = {
    razon:     'AGROVETERINARIA ALIVET S.A.C.',
    ruc:       '20611500859',
    direccion: 'Jr. Calixto N°276 / Jr. Amazonas N°753, Huancayo, Junín - Perú',
    telefono:  '954 800 966'
};

// Aviso "MODO DEMO" — se muestra mientras NUBEFACT_ENVIRONMENT no sea
// 'produccion' en el servidor, para que nadie confunda un comprobante de
// prueba (no válido ante SUNAT) con uno real. No bloquea nada, solo informa.
async function mostrarAvisoDemo() {
    try {
        const res  = await fetch('/api/pedidos/entorno-facturacion');
        const data = await res.json();
        if (data.produccion) return; // ya está en producción: sin aviso
        const aviso = document.getElementById('aviso-demo-facturacion');
        if (!aviso) return;
        aviso.className = 'alert alert-warning small mb-3 no-print';
        aviso.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i>
            <strong>Modo DEMO:</strong> este comprobante se emite en el ambiente de
            pruebas de NubeFacT y <strong>no es válido ante SUNAT</strong>.`;
    } catch { /* si falla, simplemente no se muestra el aviso */ }
}

async function cargarConfirmacion() {
    mostrarAvisoDemo();

    const params   = new URLSearchParams(window.location.search);
    const idPedido = params.get('id_pedido');

    let pedido, comprobante, id_pedido;

    if (idPedido) {
        // Flujo actual: Mercado Pago redirige aquí con ?id_pedido=... —
        // se pide el pedido real al backend (ya debería estar PAGADO,
        // el webhook lo confirma por detrás casi al mismo tiempo).
        const token = localStorage.getItem('token');
        try {
            const resp = await fetch(`/api/pedidos/mispedidos/${idPedido}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!resp.ok) throw new Error('No se pudo obtener el pedido');
            pedido = await resp.json();
            comprobante = pedido.comprobante;
            id_pedido = idPedido;
        } catch (err) {
            console.error('Error cargando el pedido de la confirmación:', err);
            // El pago puede haber llegado 1-2 segundos antes que el webhook
            // termine de procesar. Reintenta una vez más tras una pequeña espera.
            await new Promise(r => setTimeout(r, 2000));
            try {
                const resp2 = await fetch(`/api/pedidos/mispedidos/${idPedido}`, {
                    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
                });
                pedido = await resp2.json();
                comprobante = pedido.comprobante;
                id_pedido = idPedido;
            } catch {
                window.location.href = '/perfil.html';
                return;
            }
        }
    } else {
        // Compatibilidad con el flujo antiguo (si algo todavía deja
        // datos en localStorage.ultimoPedido).
        const ultimoPedido = JSON.parse(localStorage.getItem('ultimoPedido'));
        if (!ultimoPedido) { window.location.href = '/'; return; }
        id_pedido   = ultimoPedido.id_pedido;
        comprobante = ultimoPedido.comprobante;
        pedido      = ultimoPedido.pedido;
    }

    if (!comprobante) {
        // El pago llegó pero el webhook todavía no terminó de crear el
        // comprobante — no es un error, solo hay que esperar un poco.
        document.getElementById('numero-pedido').innerHTML =
            `Pedido N° <strong>${id_pedido}</strong> — tu comprobante se está generando, actualiza esta página en unos segundos.`;
        return;
    }

    const esFactura = comprobante.tipo === 'FACTURA';
    const tituloDoc = esFactura ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA';

    document.getElementById('numero-pedido').innerHTML = `
        Pedido N° <strong>${id_pedido}</strong> &nbsp;|&nbsp;
        Comprobante: <strong>${comprobante.serie}-${comprobante.numero}</strong>
    `;

    // ── Items ──
    const detalles = pedido.detalles || [];
    const filasItems = detalles.map(item => {
        const cant = parseInt(item.cantidad) || 1;
        const pu   = parseFloat(item.precio_unitario) || 0;
        const sub  = parseFloat(item.subtotal) || (pu * cant);
        const extras = [];
        if (item.color) extras.push(`Color: ${item.color}`);
        if (item.talla) extras.push(`Talla: ${item.talla}`);
        if (item.marca) extras.push(`Marca: ${item.marca}`);
        const extrasHTML = extras.length ? `<br><small class="text-muted">${extras.join(' | ')}</small>` : '';
        return `
            <tr>
                <td class="text-center">${cant}</td>
                <td>${item.producto_nombre}${extrasHTML}</td>
                <td class="text-end">S/. ${pu.toFixed(2)}</td>
                <td class="text-end">S/. ${sub.toFixed(2)}</td>
            </tr>`;
    }).join('');

    // ── Envío como ítem del comprobante ──
    const costoEnvio = parseFloat(pedido.costo_envio) || 0;
    const filaEnvio = costoEnvio > 0 ? `
            <tr>
                <td class="text-center">1</td>
                <td>Costo de envío</td>
                <td class="text-end">S/. ${costoEnvio.toFixed(2)}</td>
                <td class="text-end">S/. ${costoEnvio.toFixed(2)}</td>
            </tr>` : '';

    // ── Totales: los precios incluyen IGV (18%) ──
    const total     = parseFloat(pedido.total) || 0;
    const opGravada = +(total / 1.18).toFixed(2);
    const igv       = +(total - opGravada).toFixed(2);

    const docCliente = esFactura
        ? (comprobante.ruc_cliente ? `RUC: ${comprobante.ruc_cliente}` : '')
        : (comprobante.dni_cliente ? `DNI: ${comprobante.dni_cliente}` : '');
    const nombreCliente = esFactura
        ? (comprobante.razon_social || pedido.cliente_nombre || '-')
        : (comprobante.nombre_cliente || pedido.cliente_nombre || '-');
    const fecha = new Date(comprobante.fecha_emision || pedido.fecha_pedido).toLocaleDateString('es-PE');

    const estadoSunatBadge = comprobante.estado_sunat === 'ACEPTADO'
        ? '<span class="badge bg-success px-3 py-2 ms-2"><i class="bi bi-patch-check me-1"></i>Aceptado por SUNAT</span>'
        : comprobante.estado_sunat === 'OBSERVADO' || comprobante.estado_sunat === 'RECHAZADO'
            ? '<span class="badge bg-danger px-3 py-2 ms-2"><i class="bi bi-exclamation-triangle me-1"></i>Revisar comprobante</span>'
            : '<span class="badge bg-secondary px-3 py-2 ms-2"><i class="bi bi-hourglass-split me-1"></i>Comprobante en proceso</span>';

    document.getElementById('detalle-pedido').innerHTML = `
    <div class="boleta">
        <div class="row align-items-center mb-2">
            <div class="col-7">
                <h5 class="fw-bold mb-1">${EMISOR.razon}</h5>
                <div class="small">${EMISOR.direccion}</div>
                <div class="small">Tel: ${EMISOR.telefono}</div>
            </div>
            <div class="col-5">
                <div class="boleta-box text-center">
                    <div class="fw-bold">R.U.C. ${EMISOR.ruc}</div>
                    <div class="fw-bold">${tituloDoc}</div>
                    <div class="fw-bold">${comprobante.serie}-${comprobante.numero}</div>
                </div>
            </div>
        </div>

        <div class="d-flex justify-content-between small border-top border-bottom py-2 mb-2">
            <div>
                <strong>Cliente:</strong> ${nombreCliente}<br>
                ${docCliente ? `<strong>${docCliente}</strong>` : ''}
            </div>
            <div class="text-end">
                <strong>Fecha de emisión:</strong> ${fecha}<br>
                <strong>Moneda:</strong> SOLES (PEN)
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th class="text-center" style="width:12%">Cant.</th>
                    <th>Descripción</th>
                    <th class="text-end" style="width:20%">P. Unit.</th>
                    <th class="text-end" style="width:20%">Importe</th>
                </tr>
            </thead>
            <tbody>
                ${filasItems}
                ${filaEnvio}
            </tbody>
        </table>

        <div class="row mt-2">
            <div class="col-7 small text-muted">
                <i class="bi bi-info-circle me-1"></i>Representación impresa del comprobante electrónico.
            </div>
            <div class="col-5">
                <div class="d-flex justify-content-between"><span>Op. Gravada:</span><span>S/. ${opGravada.toFixed(2)}</span></div>
                <div class="d-flex justify-content-between"><span>IGV (18%):</span><span>S/. ${igv.toFixed(2)}</span></div>
                <div class="d-flex justify-content-between fw-bold fs-6 border-top pt-1"><span>IMPORTE TOTAL:</span><span>S/. ${total.toFixed(2)}</span></div>
            </div>
        </div>

        <div class="mt-3 no-print">
            <span class="badge bg-success px-3 py-2"><i class="bi bi-check-circle me-1"></i>Pago completado</span>
            <span class="badge bg-warning text-dark px-3 py-2 ms-2"><i class="bi bi-clock me-1"></i>Pendiente de envío</span>
            ${estadoSunatBadge}
        </div>

        ${comprobante.archivo_pdf ? `
        <div class="mt-2 no-print">
            <a href="${comprobante.archivo_pdf}" target="_blank" rel="noopener noreferrer" class="btn btn-success btn-sm">
                <i class="bi bi-file-earmark-arrow-down me-1"></i>Descargar PDF de ${esFactura ? 'factura' : 'boleta'}
            </a>
            <span class="small text-success ms-2"><i class="bi bi-envelope-check me-1"></i>También se envía al correo de tu cuenta</span>
        </div>` : `
        <div class="mt-2 no-print" id="comprobante-pendiente">
            <button class="btn btn-outline-secondary btn-sm" disabled>
                <span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Preparando PDF...
            </button>
            <div class="small text-muted mt-2">Cuando esté listo aparecerá la descarga y se enviará al correo de tu cuenta.</div>
        </div>`}
    </div>`;

    document.getElementById('detalle-envio').innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <p class="mb-1"><strong>Cliente:</strong> ${pedido.cliente_nombre || '-'}</p>
                <p class="mb-1"><strong>Dirección:</strong> ${pedido.direccion_entrega || '-'}</p>
                <p class="mb-1"><strong>Distrito:</strong> ${pedido.nombre_distrito || '-'}</p>
            </div>
            <div class="col-md-6">
                <p class="mb-1"><strong>Comprobante:</strong> ${pedido.tipo_comprobante || 'Boleta'}</p>
                <p class="mb-1"><strong>Estado:</strong> <span class="text-warning fw-bold">Pendiente de envío</span></p>
                <p class="mb-1"><strong>Fecha:</strong> ${fecha}</p>
            </div>
        </div>`;

    if (!comprobante.archivo_pdf && idPedido) esperarPdf(idPedido);
}

let consultaPdfActiva = false;
async function esperarPdf(idPedido) {
    if (consultaPdfActiva) return;
    consultaPdfActiva = true;
    const token = localStorage.getItem('token');

    for (let intento = 0; intento < 20; intento++) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        try {
            const res = await fetch(`/api/pedidos/mispedidos/${idPedido}`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!res.ok) continue;
            const pedidoActualizado = await res.json();
            if (pedidoActualizado.comprobante?.archivo_pdf) {
                window.location.reload();
                return;
            }
        } catch { /* reintento automático */ }
    }

    const pendiente = document.getElementById('comprobante-pendiente');
    if (pendiente) {
        pendiente.innerHTML = '<div class="alert alert-warning small mb-0">El PDF está tardando más de lo esperado. Actualiza la página o revísalo luego en “Mis pedidos”.</div>';
    }
    consultaPdfActiva = false;
}

function verMisPedidos() {
    // Marca la sección a abrir y navega al perfil
    localStorage.setItem('perfilSeccion', 'pedidos');
    window.location.href = '/perfil.html';
}

window.addEventListener('DOMContentLoaded', cargarConfirmacion);

// ═══════════════════════════════════════════════════
//  DESPACHADOR DE EVENTOS (mismo patrón que dashboard.js/index.js)
// ═══════════════════════════════════════════════════
document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-accion]');
    if (!el) return;

    switch (el.dataset.accion) {
        case 'volver-inicio': window.location.href = '/'; break;
        case 'ver-pedidos':   verMisPedidos(); break;
        case 'imprimir':      window.print(); break;
    }
});
