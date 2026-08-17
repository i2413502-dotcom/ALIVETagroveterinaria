const model = require('../modelos/categoria.model');
const responder = require('../utils/responder');

// GET /api/categorias — Listar todas
exports.getAll = async (req, res) => {
    try {
        const categorias = await model.getAll();
        res.json(categorias);
    } catch (error) {
        responder.error(res, 500, error.message);
    }
};

// POST /api/categorias — Crear nueva
exports.create = async (req, res) => {
    try {
        const id = await model.create(req.body);
        res.status(201).json({ id_categoria: id, mensaje: 'Categoría creada correctamente' });
    } catch (error) {
        responder.error(res, 500, error.message);
    }
};

// PUT /api/categorias/:id — Actualizar
exports.update = async (req, res) => {
    try {
        await model.update(req.params.id, req.body);
        res.json({ mensaje: 'Categoría actualizada correctamente' });
    } catch (error) {
        responder.error(res, 500, error.message);
    }
};

// DELETE /api/categorias/:id — Eliminar
exports.delete = async (req, res) => {
    try {
        await model.delete(req.params.id);
        res.json({ mensaje: 'Categoría eliminada correctamente' });
    } catch (error) {
        responder.error(res, 400, error.message);
    }
};

// ── Subcategorías ────────────────────────────────────────────────

// GET /api/categorias/:id/subcategorias
exports.getSubcategorias = async (req, res) => {
    try {
        const subcategorias = await model.getSubcategorias(req.params.id);
        res.json(subcategorias);
    } catch (error) {
        responder.error(res, 500, error.message);
    }
};

// POST /api/categorias/subcategorias
exports.createSubcategoria = async (req, res) => {
    try {
        const id = await model.createSubcategoria(req.body);
        res.status(201).json({ id_subcategoria: id, mensaje: 'Subcategoría creada correctamente' });
    } catch (error) {
        responder.error(res, 500, error.message);
    }
};

// PUT /api/categorias/subcategorias/:id
exports.updateSubcategoria = async (req, res) => {
    try {
        await model.updateSubcategoria(req.params.id, req.body);
        res.json({ mensaje: 'Subcategoría actualizada correctamente' });
    } catch (error) {
        responder.error(res, 500, error.message);
    }
};

// DELETE /api/categorias/subcategorias/:id
exports.deleteSubcategoria = async (req, res) => {
    try {
        await model.deleteSubcategoria(req.params.id);
        res.json({ mensaje: 'Subcategoría eliminada correctamente' });
    } catch (error) {
        responder.error(res, 400, error.message);
    }
};