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
// Recibe id_repartidor (id_colaborador real), no un nombre en texto.
exports.asignarRepartidor = async (req, res) => {
    try {
        const { id_repartidor } = req.body;
        await Despacho.asignarRepartidor(req.params.idPedido, id_repartidor || null);
        res.json({ mensaje: 'Repartidor asignado' });
    } catch (err) {
        console.error('Error al asignar repartidor:', err);
        res.status(500).json({ mensaje: 'Error al asignar repartidor' });
    }
};

// ── GET /api/despachos/colaboradores ──
// Lista liviana (sin cargo/DNI/correo) solo para llenar el <select> de
// repartidor. Separado del endpoint completo de colaboradores porque
// ese es exclusivo de Administrador, y aquí lo necesita cualquier
// COLABORADOR que entre a "Por Entregar Hoy".
exports.listarColaboradores = async (req, res) => {
    try {
        res.json(await Despacho.listarColaboradoresActivos());
    } catch (err) {
        console.error('Error al listar colaboradores para repartidor:', err);
        res.status(500).json({ mensaje: 'Error al obtener colaboradores' });
    }
};
