const Despacho = require('../modelos/despacho.model');

// ── GET /api/despachos ── (sin filtros: siempre trae todo lo pendiente)
exports.listar = async (req, res) => {
    try {
        const pedidos = await Despacho.listarPendientes();
        res.json({ pedidos });
    } catch (err) {
        console.error('Error al listar pendientes de entrega:', err);
        res.status(500).json({ mensaje: 'Error al obtener pendientes de entrega' });
    }
};

// ── PUT /api/despachos/:idPedido/repartidor ──
exports.asignarRepartidor = async (req, res) => {
    try {
        const { repartidor } = req.body;
        await Despacho.asignarRepartidor(req.params.idPedido, (repartidor || '').trim());
        res.json({ mensaje: 'Repartidor asignado' });
    } catch (err) {
        console.error('Error al asignar repartidor:', err);
        res.status(500).json({ mensaje: 'Error al asignar repartidor' });
    }
};
