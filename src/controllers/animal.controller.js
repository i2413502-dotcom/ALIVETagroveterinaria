const model = require('../models/animal.model');

// GET /api/animales — Listar todos
exports.getAll = async (req, res) => {
    try {
        const animales = await model.getAll();
        res.json(animales);
    } catch (error) {
        res.status(500).json({ mensaje: error.message });
    }
};

// POST /api/animales — Crear nuevo
exports.create = async (req, res) => {
    try {
        const id = await model.create(req.body);
        res.status(201).json({ id_tipo_animal: id, mensaje: 'Animal creado correctamente' });
    } catch (error) {
        res.status(500).json({ mensaje: error.message });
    }
};

// PUT /api/animales/:id — Actualizar
exports.update = async (req, res) => {
    try {
        await model.update(req.params.id, req.body);
        res.json({ mensaje: 'Animal actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ mensaje: error.message });
    }
};

// DELETE /api/animales/:id — Eliminar
exports.delete = async (req, res) => {
    try {
        await model.delete(req.params.id);
        res.json({ mensaje: 'Animal eliminado correctamente' });
    } catch (error) {
        res.status(400).json({ mensaje: error.message });
    }
};