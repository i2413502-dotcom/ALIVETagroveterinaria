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