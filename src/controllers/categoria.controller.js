const model = require('../models/categoria.model');

// GET /api/categorias — Listar todas
exports.getAll = async (req, res) => {
    try {
        const categorias = await model.getAll();
        res.json(categorias);
    } catch (error) {
        res.status(500).json({ mensaje: error.message });
    }
};

// POST /api/categorias — Crear nueva
exports.create = async (req, res) => {
    try {
        const id = await model.create(req.body);
        res.status(201).json({ id_categoria: id, mensaje: 'Categoría creada correctamente' });
    } catch (error) {
        res.status(500).json({ mensaje: error.message });
    }
};

// PUT /api/categorias/:id — Actualizar
exports.update = async (req, res) => {
    try {
        await model.update(req.params.id, req.body);
        res.json({ mensaje: 'Categoría actualizada correctamente' });
    } catch (error) {
        res.status(500).json({ mensaje: error.message });
    }
};

// DELETE /api/categorias/:id — Eliminar
exports.delete = async (req, res) => {
    try {
        await model.delete(req.params.id);
        res.json({ mensaje: 'Categoría eliminada correctamente' });
    } catch (error) {
        res.status(400).json({ mensaje: error.message });
    }
};