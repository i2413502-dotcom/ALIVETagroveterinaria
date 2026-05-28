// Datos del emisor — REEMPLAZAR por los datos reales de la empresa (sobre todo el RUC)
const EMISOR = {
    razon:     'AGROVETERINARIA ALIVET S.A.C.',
    ruc:       '20000000000',
    direccion: 'Jr. Calixto N°276, Huancayo, Junín - Perú',
    telefono:  '954 800 966'
};

function cargarConfirmacion() {
    const ultimoPedido = JSON.parse(localStorage.getItem('ultimoPedido'));
    if (!ultimoPedido) { window.location.href = '/'; return; }

    const { id_pedido, comprobante, pedido } = ultimoPedido;
    const esFactura = (pedido.tipo_comprobante || '').toLowerCase().includes('factura');
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

    const docCliente = pedido.cliente_documento
        ? `${esFactura ? 'RUC' : 'DNI'}: ${pedido.cliente_documento}` : '';
    const fecha = new Date(pedido.fecha_pedido).toLocaleDateString('es-PE');

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
                <strong>Cliente:</strong> ${pedido.cliente_nombre || '-'}<br>
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
        </div>
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
}

function verMisPedidos() {
    // Marca la sección a abrir y navega al perfil
    localStorage.setItem('perfilSeccion', 'pedidos');
    window.location.href = '/perfil.html';
}

window.addEventListener('DOMContentLoaded', cargarConfirmacion);
