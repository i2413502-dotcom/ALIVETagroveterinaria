// Motor de generación de PDFs para el módulo de reportes.
// Antes vivía mezclado dentro de reporte.controller.js; se separa
// porque "dibujar un PDF" es lógica de renderizado, no de HTTP.
const path = require('path');
const fs   = require('fs');

const VERDE     = '#06A049';
const LOGO_PATH = path.join(__dirname, '..', '..', 'public', 'img', 'logo.jpeg');

// Carga perezosa: el servidor arranca aunque pdfkit no esté instalado.
// Las funciones devuelven null y el controller decide qué responder.
function cargarPdfkit() {
    try { return require('pdfkit'); }
    catch (e) { return null; }
}

function dibujarEncabezado(doc, subtitulo) {
    if (fs.existsSync(LOGO_PATH)) { try { doc.image(LOGO_PATH, 40, 30, { width: 55 }); } catch (_) {} }
    doc.fontSize(18).fillColor(VERDE).text('AGROVETERINARIA ALIVET', 105, 38);
    doc.fontSize(11).fillColor('#333').text(subtitulo, 105, 62);
    doc.fontSize(9).fillColor('#666').text('Generado: ' + new Date().toLocaleString('es-PE'), 105, 78);
    doc.moveTo(40, 100).lineTo(555, 100).strokeColor(VERDE).lineWidth(1).stroke();
}

const NOMBRES_MES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// PDF específico del reporte de ventas (columnas fijas: fecha, pedido, cliente...)
// filtro: { mes, anio } — opcional, si vienen vacíos se ve todo el historial
// (mismo comportamiento que antes de agregar el filtro).
function generarPdfVentas(res, ventas, filtro = {}) {
    const PDFDocument = cargarPdfkit();
    if (!PDFDocument) return false;

    const { mes, anio } = filtro;
    let subtitulo = 'Reporte de Ventas — Todo el historial';
    if (mes && anio)      subtitulo = `Reporte de Ventas — ${NOMBRES_MES[mes]} ${anio}`;
    else if (anio)        subtitulo = `Reporte de Ventas — Año ${anio}`;
    else if (mes)         subtitulo = `Reporte de Ventas — ${NOMBRES_MES[mes]} (todos los años)`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-ventas.pdf"');

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    dibujarEncabezado(doc, subtitulo);

    const cols = [
        { t: 'Fecha',    x: 40,  w: 70 },
        { t: 'Pedido',   x: 110, w: 45 },
        { t: 'Cliente',  x: 155, w: 95 },
        { t: 'Producto', x: 250, w: 130 },
        { t: 'Cant.',    x: 380, w: 35 },
        { t: 'P. Unit.', x: 415, w: 60 },
        { t: 'Subtotal', x: 475, w: 80 }
    ];
    let y = 112;
    const drawHeader = () => {
        doc.rect(40, y, 515, 18).fill(VERDE);
        doc.fillColor('#fff').fontSize(9);
        cols.forEach(c => doc.text(c.t, c.x + 2, y + 5, { width: c.w - 4 }));
        y += 18;
    };
    drawHeader();

    let total = 0;
    doc.fontSize(8);
    ventas.forEach((v, i) => {
        if (y > 770) { doc.addPage(); y = 40; drawHeader(); doc.fontSize(8); }
        if (i % 2 === 0) doc.rect(40, y, 515, 16).fill('#f3f7f4');
        doc.fillColor('#333');
        const fila = [
            new Date(v.fecha_pedido).toLocaleDateString('es-PE'),
            '#' + v.id_pedido,
            v.cliente,
            v.producto,
            String(v.cantidad),
            'S/. ' + Number(v.precio_unitario).toFixed(2),
            'S/. ' + Number(v.subtotal).toFixed(2)
        ];
        cols.forEach((c, idx) => doc.text(fila[idx], c.x + 2, y + 4, { width: c.w - 4, ellipsis: true }));
        total += Number(v.subtotal);
        y += 16;
    });

    if (!ventas.length) {
        doc.fillColor('#666').fontSize(10).text('No hay ventas registradas.', 40, y + 6);
        y += 22;
    }

    y += 10;
    doc.fontSize(12).fillColor(VERDE).text('TOTAL: S/. ' + total.toFixed(2), 40, y, { width: 515, align: 'right' });

    doc.end();
    return true;
}

// PDF genérico reutilizable para cualquier entidad del dashboard
// (clientes, productos, pedidos, categorías, animales, colaboradores)
function generarPdfGenerico(res, def, rows, filename) {
    const PDFDocument = cargarPdfkit();
    if (!PDFDocument) return false;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    dibujarEncabezado(doc, 'Reporte: ' + def.titulo);

    const totalW = def.columnas.reduce((s, c) => s + (c.width || 18), 0);
    let x = 40;
    const cols = def.columnas.map(c => { const w = (c.width || 18) / totalW * 515; const o = { ...c, x, w }; x += w; return o; });

    let y = 112;
    const drawHeader = () => {
        doc.rect(40, y, 515, 18).fill(VERDE);
        doc.fillColor('#fff').fontSize(8);
        cols.forEach(c => doc.text(c.header, c.x + 2, y + 5, { width: c.w - 4, ellipsis: true }));
        y += 18;
    };
    drawHeader();
    doc.fontSize(7.5);
    rows.forEach((r, i) => {
        if (y > 780) { doc.addPage(); y = 40; drawHeader(); doc.fontSize(7.5); }
        if (i % 2 === 0) doc.rect(40, y, 515, 15).fill('#f3f7f4');
        doc.fillColor('#333');
        cols.forEach(c => doc.text(String(r[c.key] ?? ''), c.x + 2, y + 4, { width: c.w - 4, ellipsis: true }));
        y += 15;
    });
    if (!rows.length) doc.fillColor('#666').fontSize(10).text('Sin datos.', 40, y + 6);
    doc.end();
    return true;
}

module.exports = { generarPdfVentas, generarPdfGenerico };
