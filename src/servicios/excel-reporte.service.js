// Motor de generación de Excel para el módulo de reportes.
// Antes vivía mezclado dentro de reporte.controller.js; se separa
// porque "estilizar/armar un Excel" es lógica de renderizado, no de HTTP.
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Carga perezosa: el servidor arranca aunque exceljs no esté instalado.
function cargarExceljs() {
    try { return require('exceljs'); }
    catch (e) { return null; }
}

// Aplica estilo de cabecera (negrita, fondo verde, letra blanca, autofiltro)
function estilizarCabecera(ws, rango) {
    const h = ws.getRow(1);
    h.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
    h.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF06A049' } };
    h.alignment = { vertical: 'middle', horizontal: 'center' };
    h.height    = 20;
    ws.autoFilter = rango;
    ws.views = [{ state: 'frozen', ySplit: 1 }];
}

async function generarExcelVentas(res, ventas) {
    const ExcelJS = cargarExceljs();
    if (!ExcelJS) return false;

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
    return true;
}

async function generarExcelProductos(res, items) {
    const ExcelJS = cargarExceljs();
    if (!ExcelJS) return false;

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
    return true;
}

// Excel crudo sin estilos, pensado para que Power BI lo ingiera directo
async function generarExcelVentasPowerBI(res, ventas) {
    const ExcelJS = cargarExceljs();
    if (!ExcelJS) return false;

    const wb = new ExcelJS.Workbook();
    wb.creator = 'AgroVeterinaria ALIVET';
    const ws = wb.addWorksheet('Ventas');

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
    return true;
}

// Excel genérico reutilizable para cualquier entidad del dashboard
async function generarExcelGenerico(res, def, rows, conEstilos, filename) {
    const ExcelJS = cargarExceljs();
    if (!ExcelJS) return false;

    const wb = new ExcelJS.Workbook();
    wb.creator = 'AgroVeterinaria ALIVET';
    const ws = wb.addWorksheet(def.titulo);
    ws.columns = def.columnas.map(c => ({ header: c.header, key: c.key, width: c.width || 18 }));

    if (conEstilos) {
        const last = String.fromCharCode(64 + def.columnas.length);
        estilizarCabecera(ws, `A1:${last}1`);
    }
    rows.forEach(r => ws.addRow(r));

    res.setHeader('Content-Type', XLSX_MIME);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
    return true;
}

module.exports = { generarExcelVentas, generarExcelProductos, generarExcelVentasPowerBI, generarExcelGenerico };
