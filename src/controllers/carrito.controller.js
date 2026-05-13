const carritoModel = require('../models/carrito.model');

exports.obtenerProductosCarrito = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || ids.length === 0) return res.json([]);
        
        const productos = await carritoModel.obtenerProductosPorIds(ids);
        res.json(productos);
    } catch (err) {
        console.error("Error en carrito:", err);
        res.status(500).json({ mensaje: "Error al obtener productos del carrito" });
    }
};