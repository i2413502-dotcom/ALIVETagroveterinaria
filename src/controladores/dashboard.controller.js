const dashboardModel = require('../modelos/dashboard.model');
const minioService   = require('../servicios/minio.service');

exports.getDashboardData = async (req, res) => {
    try {
        const datos = await dashboardModel.getDashboardData();
        res.json(datos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error en dashboard" });
    }
};

exports.getVentasPorMes = async (req, res) => {
    try {
        res.json(await dashboardModel.getVentasPorMes());
    } catch (error) {
        res.status(500).json({ mensaje: "Error al obtener ventas por mes" });
    }
};

exports.getProductosMasVendidos = async (req, res) => {
    try {
        res.json(await dashboardModel.getProductosMasVendidos());
    } catch (error) {
        res.status(500).json({ mensaje: "Error al obtener productos más vendidos" });
    }
};

exports.getTopClientes = async (req, res) => {
    try {
        res.json(await dashboardModel.getTopClientes(req.query.limite));
    } catch (error) {
        res.status(500).json({ mensaje: "Error al obtener top de clientes" });
    }
};

exports.getStockProductos = async (req, res) => {
    try {
        res.json(await dashboardModel.getStockProductos());
    } catch (error) {
        res.status(500).json({ mensaje: "Error al obtener stock" });
    }
};

exports.getPedidos = async (req, res) => {
    try {
        res.json(await dashboardModel.getPedidos());
    } catch (error) {
        res.status(500).json({ mensaje: "Error al obtener pedidos" });
    }
};

exports.actualizarEstadoPedido = async (req, res) => {
    try {
        const { id }    = req.params;
        const { estado } = req.body;
        await dashboardModel.actualizarEstadoPedido(id, estado);
        res.json({ mensaje: "Estado actualizado" });
    } catch (error) {
        res.status(500).json({ mensaje: "Error al actualizar estado" });
    }
};

// GET /api/pedidos/buscar-codigo/:codigo — usado por "Evidencia" (acceso
// rápido del móvil): identifica el pedido por su N° de boleta/factura
// ANTES de subir la foto, para no subir nada a R2 si el código no existe.
exports.buscarPedidoPorCodigo = async (req, res) => {
    try {
        const { codigo } = req.params;
        if (!codigo) return res.status(400).json({ mensaje: 'Código requerido' });
        const pedido = await dashboardModel.buscarPorCodigoComprobante(codigo);
        if (!pedido) return res.status(404).json({ mensaje: 'No se encontró ningún pedido con ese código' });
        res.json(pedido);
    } catch (error) {
        console.error('Error buscando pedido por código:', error);
        res.status(500).json({ mensaje: 'Error al buscar el pedido' });
    }
};

// PUT /api/pedidos/:id/evidencia-cancelacion — sube la foto a R2 y en el
// mismo paso marca el pedido como CANCELADO (ver dashboard.model.js ->
// guardarEvidenciaCancelacion). Pensado para el repartidor: cuando no
// pudo entregar (cliente ausente, rechazó el producto, etc.), deja
// evidencia fotográfica junto con el cambio de estado, en vez de
// cancelar "a ciegas" desde Gestión de Ventas sin ninguna prueba.
exports.subirEvidenciaCancelacion = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.file) return res.status(400).json({ mensaje: 'No se recibió ninguna foto' });

        const url = await minioService.uploadFile(
            req.file.buffer,
            req.file.originalname,
            'evidencias-pedido'
        );

        await dashboardModel.guardarEvidenciaCancelacion(id, url);
        res.json({ mensaje: 'Pedido cancelado con evidencia guardada', url });
    } catch (error) {
        console.error('Error subiendo evidencia de cancelación:', error);
        res.status(500).json({ mensaje: 'Error al guardar la evidencia' });
    }
};
exports.getDetallePedido = async (req, res) => {
    try {
        const pedidoModel = require('../modelos/pedido.model');
        const pedido = await pedidoModel.obtenerPedidoCompleto(req.params.id);
        if (!pedido) return res.status(404).json({ mensaje: 'Pedido no encontrado' });
        res.json(pedido);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener pedido' });
    }

};

