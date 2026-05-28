const path    = require('path');
const fs      = require('fs');
const Reporte = require('../models/reporte.model');

const VERDE = '#06A049';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Carga perezosa: el servidor arranca aunque pdfkit/exceljs aún no estén instalados.
// Las exportaciones devuelven 503 con instrucciones hasta que se corra "npm install".
function cargarDependencia(nombre) {
    try { return require(nombre); }
    catch (e) { return null; }
}
const ERR_DEP = 'Dependencia faltante. Ejecuta "npm install pdfkit exceljs" y reinicia el servidor.';

// ════════════ JSON (KPIs / gráficos / tabla) ════════════
exports.resumen = async (req, res) => {
    try { res.json(await Reporte.getResumen()); }
    catch (e) { console.error('Error resumen:', e); res.status(500).json({ mensaje: 'Error al obtener resumen' }); }
};

exports.ventasPorCategoria = async (req, res) => {
    try { res.json(await Reporte.getVentasPorCategoria()); }
    catch (e) { console.error('Error ventas por categoría:', e); res.status(500).json({ mensaje: 'Error' }); }
};

exports.productosStockBajo = async (req, res) => {
    try { res.json(await Reporte.getProductosStockBajo()); }
    catch (e) { console.error('Error stock bajo:', e); res.status(500).json({ mensaje: 'Error' }); }
};

// ════════════ PDF (pdfkit puro) ════════════
exports.exportarVentasPDF = async (req, res) => {
    const PDFDocument = cargarDependencia('pdfkit');
    if (!PDFDocument) return res.status(503).json({ mensaje: ERR_DEP });
    try {
        const ventas = await Reporte.getVentasDetalladas();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="reporte-ventas.pdf"');

        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        doc.pipe(res);

        // ── Encabezado: logo + empresa + fecha ──
        const logo = path.join(__dirname, '..', '..', 'public', 'img', 'logo.jpeg');
        if (fs.existsSync(logo)) { try { doc.image(logo, 40, 30, { width: 55 }); } catch (_) {} }
        doc.fontSize(18).fillColor(VERDE).text('AGROVETERINARIA ALIVET', 105, 38);
        doc.fontSize(11).fillColor('#333').text('Reporte de Ventas', 105, 62);
        doc.fontSize(9).fillColor('#666').text('Generado: ' + new Date().toLocaleString('es-PE'), 105, 78);
        doc.moveTo(40, 100).lineTo(555, 100).strokeColor(VERDE).lineWidth(1).stroke();

        // ── Columnas ──
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
    } catch (e) {
        console.error('Error PDF ventas:', e);
        if (!res.headersSent) res.status(500).json({ mensaje: 'Error al generar el PDF' });
    }
};

// Aplica estilo de cabecera (negrita, fondo verde, letra blanca)
function estilizarCabecera(ws, rango) {
    const h = ws.getRow(1);
    h.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
    h.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF06A049' } };
    h.alignment = { vertical: 'middle', horizontal: 'center' };
    h.height    = 20;
    ws.autoFilter = rango;
    ws.views = [{ state: 'frozen', ySplit: 1 }];
}

// ════════════ Excel de Ventas (con estilos) ════════════
exports.exportarVentasExcel = async (req, res) => {
    const ExcelJS = cargarDependencia('exceljs');
    if (!ExcelJS) return res.status(503).json({ mensaje: ERR_DEP });
    try {
        const ventas = await Reporte.getVentasDetalladas();
        const wb = new ExcelJS.Workbook();
        wb.creator = 'AgroVeterinaria ALIVET';
        const ws = wb.addWorksheet('Ventas');

        ws.columns = [
            { header: 'Pedido',       key: 'id_pedido',       width: 10 },
            { header: 'Fecha',        key: 'fecha',           width: 20 },
            { header: 'Cliente',      key: 'cliente',         width: 28 },
            { header: 'Producto',     key: 'producto',        width: 30 },
            { header: 'Categoría',    key: 'categoria',       width: 18 },
            { header: 'Cantidad',     key: 'cantidad',        width: 12 },
            { header: 'Precio Unit.', key: 'precio_unitario', width: 14 },
            { header: 'Subtotal',     key: 'subtotal',        width: 14 },
            { header: 'Estado',       key: 'estado',          width: 14 }
        ];
        estilizarCabecera(ws, 'A1:I1');

        ventas.forEach(v => ws.addRow({
            id_pedido:       v.id_pedido,
            fecha:           new Date(v.fecha_pedido).toLocaleString('es-PE'),
            cliente:         v.cliente,
            producto:        v.producto,
            categoria:       v.categoria,
            cantidad:        Number(v.cantidad),
            precio_unitario: Number(v.precio_unitario),
            subtotal:        Number(v.subtotal),
            estado:          v.estado
        }));
        ws.getColumn('precio_unitario').numFmt = '"S/. "#,##0.00';
        ws.getColumn('subtotal').numFmt        = '"S/. "#,##0.00';

        res.setHeader('Content-Type', XLSX_MIME);
        res.setHeader('Content-Disposition', 'attachment; filename="reporte-ventas.xlsx"');
        await wb.xlsx.write(res);
        res.end();
    } catch (e) {
        console.error('Error Excel ventas:', e);
        if (!res.headersSent) res.status(500).json({ mensaje: 'Error al generar el Excel' });
    }
};

// ════════════ Excel de Inventario (con estilos) ════════════
exports.exportarProductosExcel = async (req, res) => {
    const ExcelJS = cargarDependencia('exceljs');
    if (!ExcelJS) return res.status(503).json({ mensaje: ERR_DEP });
    try {
        const items = await Reporte.getInventario();
        const wb = new ExcelJS.Workbook();
        wb.creator = 'AgroVeterinaria ALIVET';
        const ws = wb.addWorksheet('Inventario');

        ws.columns = [
            { header: 'ID',          key: 'id_producto',  width: 8 },
            { header: 'Producto',    key: 'nombre',       width: 32 },
            { header: 'Categoría',   key: 'categoria',    width: 18 },
            { header: 'Tipo Animal', key: 'tipo_animal',  width: 16 },
            { header: 'Marca',       key: 'marca',        width: 16 },
            { header: 'Precio',      key: 'precio_venta', width: 12 },
            { header: 'Stock',       key: 'stock_actual', width: 10 },
            { header: 'Stock Mín.',  key: 'stock_minimo', width: 12 },
            { header: 'Estado',      key: 'estado',       width: 12 }
        ];
        estilizarCabecera(ws, 'A1:I1');

        items.forEach(p => ws.addRow({ ...p, precio_venta: Number(p.precio_venta) }));
        ws.getColumn('precio_venta').numFmt = '"S/. "#,##0.00';

        // Resaltar en rojo los productos con stock bajo
        ws.eachRow((row, n) => {
            if (n === 1) return;
            const stock = Number(row.getCell('stock_actual').value);
            const min   = Number(row.getCell('stock_minimo').value);
            if (!isNaN(stock) && !isNaN(min) && stock <= min) {
                row.getCell('stock_actual').font = { color: { argb: 'FFC0111B' }, bold: true };
            }
        });

        res.setHeader('Content-Type', XLSX_MIME);
        res.setHeader('Content-Disposition', 'attachment; filename="inventario.xlsx"');
        await wb.xlsx.write(res);
        res.end();
    } catch (e) {
        console.error('Error Excel inventario:', e);
        if (!res.headersSent) res.status(500).json({ mensaje: 'Error al generar el Excel' });
    }
};

// ════════════ Excel crudo para Power BI (sin estilos) ════════════
exports.exportarVentasPowerBI = async (req, res) => {
    const ExcelJS = cargarDependencia('exceljs');
    if (!ExcelJS) return res.status(503).json({ mensaje: ERR_DEP });
    try {
        const ventas = await Reporte.getVentasDetalladas();
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Ventas');

        // Solo encabezados de texto y datos planos (Power BI los ingiere directo)
        ws.addRow(['id_pedido', 'fecha_pedido', 'cliente', 'categoria', 'producto', 'cantidad', 'precio_unitario', 'subtotal', 'estado']);
        ventas.forEach(v => ws.addRow([
            v.id_pedido,
            new Date(v.fecha_pedido).toISOString(),
            v.cliente,
            v.categoria,
            v.producto,
            Number(v.cantidad),
            Number(v.precio_unitario),
            Number(v.subtotal),
            v.estado
        ]));

        res.setHeader('Content-Type', XLSX_MIME);
        res.setHeader('Content-Disposition', 'attachment; filename="ventas-powerbi.xlsx"');
        await wb.xlsx.write(res);
        res.end();
    } catch (e) {
        console.error('Error Excel Power BI:', e);
        if (!res.headersSent) res.status(500).json({ mensaje: 'Error al generar el Excel' });
    }
};

// ════════════ Exportación genérica por entidad (tabs del dashboard) ════════════
const ENTIDADES = {
    clientes: {
        titulo: 'Clientes',
        columnas: [
            { header: 'Nombre',    key: 'nombre',    width: 30 },
            { header: 'Correo',    key: 'correo',    width: 28 },
            { header: 'Teléfono',  key: 'telefono',  width: 14 },
            { header: 'Documento', key: 'documento', width: 16 },
            { header: 'Registro',  key: 'registro',  width: 14 }
        ],
        fetch: Reporte.getClientesExport
    },
    productos: {
        titulo: 'Inventario',
        columnas: [
            { header: 'ID',        key: 'id_producto',  width: 8 },
            { header: 'Producto',  key: 'nombre',       width: 28 },
            { header: 'Categoría', key: 'categoria',    width: 18 },
            { header: 'Animal',    key: 'tipo_animal',  width: 14 },
            { header: 'Marca',     key: 'marca',        width: 14 },
            { header: 'Precio',    key: 'precio_venta', width: 12 },
            { header: 'Stock',     key: 'stock_actual', width: 9 },
            { header: 'Estado',    key: 'estado',       width: 12 }
        ],
        fetch: Reporte.getInventario
    },
    pedidos: {
        titulo: 'Pedidos',
        columnas: [
            { header: 'Pedido',  key: 'id_pedido', width: 10 },
            { header: 'Fecha',   key: 'fecha',     width: 18 },
            { header: 'Cliente', key: 'cliente',   width: 28 },
            { header: 'Total',   key: 'total',     width: 14 },
            { header: 'Estado',  key: 'estado',    width: 14 }
        ],
        fetch: Reporte.getPedidosExport
    },
    categorias: {
        titulo: 'Categorías',
        columnas: [
            { header: 'ID',          key: 'id_categoria', width: 8 },
            { header: 'Nombre',      key: 'nombre',       width: 24 },
            { header: 'Descripción', key: 'descripcion',  width: 38 },
            { header: 'Estado',      key: 'estado',       width: 12 }
        ],
        fetch: Reporte.getCategoriasExport
    },
    animales: {
        titulo: 'Tipos de Animal',
        columnas: [
            { header: 'ID',     key: 'id_tipo_animal', width: 8 },
            { header: 'Nombre', key: 'nombre',         width: 24 },
            { header: 'Estado', key: 'estado',         width: 12 }
        ],
        fetch: Reporte.getAnimalesExport
    },
    colaboradores: {
        titulo: 'Colaboradores',
        columnas: [
            { header: 'ID',      key: 'id_colaborador', width: 8 },
            { header: 'Nombre',  key: 'nombre',         width: 26 },
            { header: 'Usuario', key: 'usuario',        width: 16 },
            { header: 'DNI',     key: 'dni',            width: 12 },
            { header: 'Cargo',   key: 'cargo',          width: 18 },
            { header: 'Correo',  key: 'correo',         width: 26 },
            { header: 'Estado',  key: 'estado',         width: 12 }
        ],
        fetch: Reporte.getColaboradoresExport
    }
};

function slug(texto) {
    return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-');
}

async function generarExcelGenerico(res, def, rows, conEstilos, filename) {
    const ExcelJS = cargarDependencia('exceljs');
    if (!ExcelJS) return res.status(503).json({ mensaje: ERR_DEP });
    const wb = new ExcelJS.Workbook();
    wb.creator = 'AgroVeterinaria ALIVET';
    const ws = wb.addWorksheet(def.titulo);
    ws.columns = def.columnas.map(c => ({ header: c.header, key: c.key, width: c.width || 18 }));
    if (conEstilos) {
        const h = ws.getRow(1);
        h.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
        h.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF06A049' } };
        h.alignment = { vertical: 'middle', horizontal: 'center' };
        h.height    = 20;
        const last = String.fromCharCode(64 + def.columnas.length);
        ws.autoFilter = `A1:${last}1`;
        ws.views = [{ state: 'frozen', ySplit: 1 }];
    }
    rows.forEach(r => ws.addRow(r));
    res.setHeader('Content-Type', XLSX_MIME);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
}

async function generarPDFGenerico(res, def, rows) {
    const PDFDocument = cargarDependencia('pdfkit');
    if (!PDFDocument) return res.status(503).json({ mensaje: ERR_DEP });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${slug(def.titulo)}.pdf"`);
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    const logo = path.join(__dirname, '..', '..', 'public', 'img', 'logo.jpeg');
    if (fs.existsSync(logo)) { try { doc.image(logo, 40, 30, { width: 55 }); } catch (_) {} }
    doc.fontSize(18).fillColor(VERDE).text('AGROVETERINARIA ALIVET', 105, 38);
    doc.fontSize(11).fillColor('#333').text('Reporte: ' + def.titulo, 105, 62);
    doc.fontSize(9).fillColor('#666').text('Generado: ' + new Date().toLocaleString('es-PE'), 105, 78);
    doc.moveTo(40, 100).lineTo(555, 100).strokeColor(VERDE).lineWidth(1).stroke();

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
}

// GET /api/reportes/exportar/:entidad/:formato  (formato: excel | pdf | powerbi)
exports.exportarEntidad = async (req, res) => {
    const { entidad, formato } = req.params;
    const def = ENTIDADES[entidad];
    if (!def) return res.status(404).json({ mensaje: 'Entidad no válida' });
    try {
        const rows = await def.fetch();
        if (formato === 'excel')   return generarExcelGenerico(res, def, rows, true,  `${slug(def.titulo)}.xlsx`);
        if (formato === 'powerbi') return generarExcelGenerico(res, def, rows, false, `${slug(def.titulo)}-powerbi.xlsx`);
        if (formato === 'pdf')     return generarPDFGenerico(res, def, rows);
        return res.status(400).json({ mensaje: 'Formato no válido' });
    } catch (e) {
        console.error('Error exportando ' + entidad + ':', e);
        if (!res.headersSent) res.status(500).json({ mensaje: 'Error al exportar' });
    }
};
