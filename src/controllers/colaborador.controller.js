const model = require('../models/colaborador.model');

exports.getAll = async (req, res) => {
    try { res.json(await model.getAll()); }
    catch (e) { res.status(500).json({ mensaje: e.message }); }
};

exports.getCargos = async (req, res) => {
    try { res.json(await model.getCargos()); }
    catch (e) { res.status(500).json({ mensaje: e.message }); }
};

exports.create = async (req, res) => {
    try {
        const id = await model.create(req.body);
        res.status(201).json({ id_colaborador: id, mensaje: 'Colaborador creado correctamente' });
    } catch (e) { res.status(500).json({ mensaje: e.message }); }
};

exports.update = async (req, res) => {
    try {
        await model.update(req.params.id, req.body);
        res.json({ mensaje: 'Colaborador actualizado correctamente' });
    } catch (e) { res.status(500).json({ mensaje: e.message }); }
};

exports.resetPassword = async (req, res) => {
    try {
        await model.resetPassword(req.params.id, req.body.nuevaPassword);
        res.json({ mensaje: 'Contraseña restablecida correctamente' });
    } catch (e) { res.status(500).json({ mensaje: e.message }); }
};