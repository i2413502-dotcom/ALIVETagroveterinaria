const clienteModel = require('../modelos/cliente.model');

exports.obtenerClientes = async (req, res) => {
    try {
        const clientes = await clienteModel.obtenerClientes();
        res.json(clientes);
    } catch (err) {
        console.error('Error al obtener clientes:', err);
        res.status(500).json({ mensaje: 'Error al obtener clientes' });
    }
};

// PUT /api/clientes/:idPersona/estado — activar/desactivar (nunca eliminar)
exports.cambiarEstado = async (req, res) => {
    try {
        const { estado } = req.body;
        if (!['ACTIVO', 'INACTIVO'].includes(estado)) {
            return res.status(400).json({ mensaje: 'Estado inválido' });
        }
        await clienteModel.cambiarEstado(req.params.idPersona, estado);
        res.json({ mensaje: `Cliente ${estado === 'ACTIVO' ? 'activado' : 'desactivado'} correctamente` });
    } catch (err) {
        console.error('Error al cambiar estado de cliente:', err);
        res.status(500).json({ mensaje: 'Error al cambiar el estado del cliente' });
    }
};