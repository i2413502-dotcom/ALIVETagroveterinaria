const clienteModel = require('../models/cliente.model');

exports.obtenerClientes = async (req, res) => {
    try {
        const clientes = await clienteModel.obtenerClientes();
        res.json(clientes);
    } catch (err) {
        console.error('Error al obtener clientes:', err);
        res.status(500).json({ mensaje: 'Error al obtener clientes' });
    }
};