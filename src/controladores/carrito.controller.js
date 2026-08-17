const carritoModel = require('../modelos/carrito.model');
const responder = require('../utils/responder');

exports.obtenerProductosCarrito = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || ids.length === 0) return res.json([]);
        
        const productos = await carritoModel.obtenerProductosPorIds(ids);
        res.json(productos);
    } catch (err) {
        responder.error(res, 500, 'Error al obtener productos del carrito', err, 'Error en carrito:');
    }
};