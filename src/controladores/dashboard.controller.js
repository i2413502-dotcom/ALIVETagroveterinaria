const dashboardModel = require('../modelos/dashboard.model');

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

