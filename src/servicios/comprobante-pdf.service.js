const PDFDocument = require('pdfkit');

function generarBuffer(pedido, comprobante) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4', margin: 45 });
        const chunks = [];
        doc.on('data', c => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const esFactura = comprobante.tipo === 'FACTURA';
        const total = Number(pedido.total) || 0;
        const gravada = +(total / 1.18).toFixed(2);
        const igv = +(total - gravada).toFixed(2);
        doc.fontSize(18).fillColor('#087f3d').text('AGROVETERINARIA ALIVET S.A.C.');
        doc.fontSize(9).fillColor('#333').text('R.U.C. 20611500859');
        doc.text('Jr. Calixto N°276 / Jr. Amazonas N°753, Huancayo, Junín - Perú');
        doc.text('Tel: 954 800 966');
        doc.rect(350, 45, 195, 70).stroke('#333');
        doc.fontSize(11).fillColor('#111').text(esFactura ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA', 360, 62, { width: 175, align: 'center' });
        doc.fontSize(13).text(`${comprobante.serie}-${comprobante.numero}`, 360, 84, { width: 175, align: 'center' });
        doc.moveDown(3);
        const cliente = esFactura ? (comprobante.razon_social || pedido.cliente_nombre) : (comprobante.nombre_cliente || pedido.cliente_nombre);
        doc.fontSize(10).text(`Cliente: ${cliente || '-'}`);
        const documento = esFactura ? comprobante.ruc_cliente : comprobante.dni_cliente;
        if (documento) doc.text(`${esFactura ? 'RUC' : 'DNI'}: ${documento}`);
        doc.text(`Fecha: ${new Date(comprobante.fecha_emision || pedido.fecha_pedido).toLocaleDateString('es-PE')}`);
        doc.moveDown();
        let y = doc.y;
        doc.rect(45, y, 500, 22).fill('#e9ecef');
        doc.fillColor('#111').fontSize(9).text('Cant.', 50, y + 7, { width: 45 }).text('Descripción', 100, y + 7, { width: 260 });
        doc.text('P. Unit.', 365, y + 7, { width: 75, align: 'right' }).text('Importe', 445, y + 7, { width: 95, align: 'right' });
        y += 28;
        for (const item of pedido.detalles || []) {
            const cantidad = Number(item.cantidad) || 0, precio = Number(item.precio_unitario) || 0;
            const subtotal = Number(item.subtotal) || precio * cantidad;
            doc.text(String(cantidad), 50, y, { width: 45, align: 'center' }).text(item.producto_nombre || 'Producto', 100, y, { width: 260 });
            doc.text(`S/. ${precio.toFixed(2)}`, 365, y, { width: 75, align: 'right' }).text(`S/. ${subtotal.toFixed(2)}`, 445, y, { width: 95, align: 'right' });
            y += 22;
        }
        if (Number(pedido.costo_envio) > 0) {
            const envio = Number(pedido.costo_envio).toFixed(2);
            doc.text('1', 50, y, { width: 45, align: 'center' }).text('Costo de envío', 100, y, { width: 260 });
            doc.text(`S/. ${envio}`, 365, y, { width: 75, align: 'right' }).text(`S/. ${envio}`, 445, y, { width: 95, align: 'right' }); y += 26;
        }
        doc.moveTo(350, y).lineTo(545, y).stroke('#999');
        doc.text(`Op. Gravada: S/. ${gravada.toFixed(2)}`, 350, y + 8, { width: 195, align: 'right' });
        doc.text(`IGV (18%): S/. ${igv.toFixed(2)}`, 350, y + 24, { width: 195, align: 'right' });
        doc.fontSize(12).text(`IMPORTE TOTAL: S/. ${total.toFixed(2)}`, 330, y + 44, { width: 215, align: 'right' });
        doc.fontSize(8).fillColor('#666').text(comprobante.estado_sunat === 'ACEPTADO' ? 'Representación impresa del comprobante electrónico aceptado por SUNAT.' : 'Representación emitida por ALIVET. Validación SUNAT pendiente.', 45, y + 85);
        doc.end();
    });
}
module.exports = { generarBuffer };
