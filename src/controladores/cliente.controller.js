const clienteModel = require('../modelos/cliente.model');
const responder = require('../utils/responder');

exports.obtenerClientes = async (req, res) => {
    try {
        const clientes = await clienteModel.obtenerClientes();
        res.json(clientes);
    } catch (err) {
        responder.error(res, 500, 'Error al obtener clientes', err, 'Error al obtener clientes:');
    }
};

// Se utiliza para el móvil
exports.eliminar = async (req, res) => {
    try {
        await clienteModel.eliminar(req.params.idPersona);
        res.json({ mensaje: 'Cliente eliminado correctamente' });
    } catch (e) {
        if (e.codigo === 'TIENE_PEDIDOS') {
            return res.status(409).json({ mensaje: e.message });
        }
        if (e.message === 'Cliente no encontrado') {
            return res.status(404).json({ mensaje: e.message });
        }
        responder.error(res, 500, 'Error al eliminar cliente', e, 'Error al eliminar cliente:');
    }
};