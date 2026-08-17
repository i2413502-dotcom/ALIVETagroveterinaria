const model = require('../modelos/animal.model');
const responder = require('../utils/responder');

// GET /api/animales — Listar todos
exports.getAll = async (req, res) => {
    try {
        const animales = await model.getAll();
        res.json(animales);
    } catch (error) {
        responder.error(res, 500, error.message);
    }
};

// POST /api/animales — Crear nuevo
exports.create = async (req, res) => {
    try {
        const id = await model.create(req.body);
        res.status(201).json({ id_tipo_animal: id, mensaje: 'Animal creado correctamente' });
    } catch (error) {
        responder.error(res, 500, error.message);
    }
};

// PUT /api/animales/:id — Actualizar
exports.update = async (req, res) => {
    try {
        await model.update(req.params.id, req.body);
        res.json({ mensaje: 'Animal actualizado correctamente' });
    } catch (error) {
        responder.error(res, 500, error.message);
    }
};

// DELETE /api/animales/:id — Eliminar
exports.delete = async (req, res) => {
    try {
        await model.delete(req.params.id);
        res.json({ mensaje: 'Animal eliminado correctamente' });
    } catch (error) {
        responder.error(res, 400, error.message);
    }
};