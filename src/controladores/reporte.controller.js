const Reporte      = require('../modelos/reporte.model');
const pdfService   = require('../servicios/pdf-reporte.service');
const excelService = require('../servicios/excel-reporte.service');

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

// ════════════ Exportaciones de Ventas ════════════
// Estas 4 funciones solo hacen el trabajo propio de un controller:
// obtener los datos y delegar el renderizado al servicio correspondiente.

exports.exportarVentasPDF = async (req, res) => {
    try {
        const { mes, anio } = req.query;
        const ventas = await Reporte.getVentasDetalladas({ mes, anio });
        const ok = pdfService.generarPdfVentas(res, ventas, { mes, anio });
        if (!ok) res.status(503).json({ mensaje: ERR_DEP });
    } catch (e) {
        console.error('Error PDF ventas:', e);
        if (!res.headersSent) res.status(500).json({ mensaje: 'Error al generar el PDF' });
    }
};

exports.exportarVentasExcel = async (req, res) => {
    try {
        const ventas = await Reporte.getVentasDetalladas();
        const ok = await excelService.generarExcelVentas(res, ventas);
        if (!ok) res.status(503).json({ mensaje: ERR_DEP });
    } catch (e) {
        console.error('Error Excel ventas:', e);
        if (!res.headersSent) res.status(500).json({ mensaje: 'Error al generar el Excel' });
    }
};

exports.exportarProductosExcel = async (req, res) => {
    try {
        // Solo productos ACTIVOS — lo mismo que se ve en la tienda web.
        // (El export genérico de la pestaña "Productos" del panel admin
        // sigue usando getInventario() completo, para que el admin
        // pueda seguir viendo inactivos/archivados ahí si lo necesita.)
        const items = await Reporte.getInventarioActivos();
        const ok = await excelService.generarExcelProductos(res, items);
        if (!ok) res.status(503).json({ mensaje: ERR_DEP });
    } catch (e) {
        console.error('Error Excel inventario:', e);
        if (!res.headersSent) res.status(500).json({ mensaje: 'Error al generar el Excel' });
    }
};

exports.exportarVentasPowerBI = async (req, res) => {
    try {
        const ventas = await Reporte.getVentasDetalladas();
        const ok = await excelService.generarExcelVentasPowerBI(res, ventas);
        if (!ok) res.status(503).json({ mensaje: ERR_DEP });
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

// NOTA: el rango de caracteres del reemplazo de tildes antes estaba escrito
// como literales Unicode invisibles pegados en el propio código fuente
// (\u0300-\u036f, marcas diacríticas combinantes). Se deja explícito con
// \u para que sea legible y no dependa de caracteres invisibles copiados.
function slug(texto) {
    return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
}

// GET /api/reportes/exportar/:entidad/:formato  (formato: excel | pdf | powerbi)
exports.exportarEntidad = async (req, res) => {
    const { entidad, formato } = req.params;
    const def = ENTIDADES[entidad];
    if (!def) return res.status(404).json({ mensaje: 'Entidad no válida' });

    try {
        const rows = await def.fetch();
        let ok;

        if (formato === 'excel') {
            ok = await excelService.generarExcelGenerico(res, def, rows, true, `${slug(def.titulo)}.xlsx`);
        } else if (formato === 'powerbi') {
            ok = await excelService.generarExcelGenerico(res, def, rows, false, `${slug(def.titulo)}-powerbi.xlsx`);
        } else if (formato === 'pdf') {
            ok = pdfService.generarPdfGenerico(res, def, rows, `${slug(def.titulo)}.pdf`);
        } else {
            return res.status(400).json({ mensaje: 'Formato no válido' });
        }

        if (!ok) res.status(503).json({ mensaje: ERR_DEP });
    } catch (e) {
        console.error('Error exportando ' + entidad + ':', e);
        if (!res.headersSent) res.status(500).json({ mensaje: 'Error al exportar' });
    }
};
