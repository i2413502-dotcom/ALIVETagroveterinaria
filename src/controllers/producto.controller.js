const Producto = require('../models/producto.model');
const db = require('../config/db');

exports.listar = async (req, res) => {
    try {
        const resultado = await Producto.obtenerProductos(req.query);
        if (req.query.pagina) {
            res.json(resultado);
        } else {
            res.json(resultado.productos);
        }
    } catch (err) {
        console.error('Error en listar productos:', err);
        res.status(500).json({ mensaje: 'Error al obtener productos' });
    }
};

exports.obtenerPorId = async (req, res) => {
    try {
        const producto = await Producto.obtenerProductoPorId(req.params.id);
        if (!producto) return res.status(404).json({ mensaje: "Producto no encontrado" });
        res.json(producto);
    } catch (err) {
        console.error("Error en obtener producto por ID:", err);
        res.status(500).json({ mensaje: "Error al obtener producto" });
    }
};

exports.crear = async (req, res) => {
    try {
        // ✅ FIX: la imagen se sube por separado y llega como nombre en el body
        const imagen = req.body.imagen || null;

        const result = await Producto.crearProducto({
            nombre:            req.body.nombre,
            descripcion:       req.body.descripcion       || null,
            imagen,
            precio_venta:      req.body.precio_venta,
            id_categoria:      req.body.id_categoria,
            id_tipo_animal:    req.body.id_tipo_animal,
            stock_actual:      req.body.stock_actual,
            stock_minimo:      req.body.stock_minimo      || 5,
            codigo_barra:      req.body.codigo_barra      || null,
            fecha_vencimiento: req.body.fecha_vencimiento || null,
            marca:             req.body.marca             || null,
            //nombre correcto del campo
            presentacion:      req.body.peso_presentacion || null,
            colores:           req.body.colores           || null,
            tallas:            req.body.tallas            || null,
            ficha_tecnica:     req.body.ficha_tecnica     || null,
            composicion:       req.body.composicion       || null,
            modo_uso:          req.body.modo_uso          || null,
        });

        res.json({ mensaje: 'Producto creado correctamente', id: result.insertId });
    } catch (error) {
        console.error('Error en crear producto:', error);
        res.status(500).json({ mensaje: 'Error al crear producto', error: error.message });
    }
};

exports.actualizar = async (req, res) => {
    try {
        await Producto.actualizarProducto(req.params.id, req.body);
        res.json({ mensaje: "Producto actualizado" });
    } catch (err) {
        console.error("Error en actualizar producto:", err);
        res.status(500).json({ mensaje: "Error al actualizar producto" });
    }
};

exports.eliminar = async (req, res) => {
    try {
        await Producto.eliminarProducto(req.params.id);
        res.json({ mensaje: "Producto eliminado" });
    } catch (err) {
        console.error("Error en eliminar producto:", err);
        res.status(500).json({ mensaje: "Error al eliminar producto" });
    }
};


exports.buscarFichaTecnica = async (req, res) => {
    try {
        const { nombre } = req.query;
        if (!nombre) return res.status(400).json({ mensaje: 'Nombre requerido' });

        const url = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(nombre)}`;
        const response = await fetch(url);

        if (!response.ok) {
            return res.json({ encontrado: false, mensaje: 'No se encontró información' });
        }

        const data = await response.json();
        res.json({
            encontrado: true,
            resumen:    data.extract || '',
            url:        data.content_urls?.desktop?.page || ''
        });

    } catch (err) {
        console.error('Error buscando ficha técnica:', err);
        res.json({ encontrado: false, mensaje: 'Error al buscar' });
    }
};

// ← AGREGADO
exports.bajoStock = async (req, res) => {
    try {
        const results = await Producto.obtenerBajoStock();
        res.json(results);
    } catch (err) {
        console.error('Error bajoStock:', err);
        res.status(500).json({ mensaje: 'Error al obtener bajo stock' });
    }
};

// ← AGREGADO
exports.proximosVencer = async (req, res) => {
    try {
        const results = await Producto.obtenerProximosVencer();
        res.json(results);
    } catch (err) {
        console.error('Error proximosVencer:', err);
        res.status(500).json({ mensaje: 'Error al obtener próximos a vencer' });
    }
};