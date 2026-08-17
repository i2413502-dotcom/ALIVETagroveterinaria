const model = require('../modelos/colaborador.model');
const emailService = require('../servicios/email.service');
const bcrypt = require('bcrypt');
const { validarPassword } = require('../utils/passwordPolicy');
const responder = require('../utils/responder');

const pendingColaboradores = new Map();

exports.getAll = async (req, res) => {
    try { res.json(await model.getAll()); }
    catch (e) {
        responder.error(res, 500, e.message);
    }
};

exports.getCargos = async (req, res) => {
    try { res.json(await model.getCargos()); }
    catch (e) {
        responder.error(res, 500, e.message);
    }
};

// Se utiliza para el móvil
exports.solicitarCreacion = async (req, res) => {
    try {
        const { correo, password, nombres, usuario } = req.body;
        if (!correo) return res.status(400).json({ mensaje: 'Correo requerido' });

        const check = validarPassword(password, { nombres, usuario, correo });
        if (!check.valida) {
            return res.status(400).json({ mensaje: check.mensaje });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const pendingId = Date.now().toString(36) + Math.random().toString(36).substr(2);

        pendingColaboradores.set(pendingId, {
            datos: req.body,
            otp,
            expiresAt: Date.now() + 15 * 60 * 1000
        });

        try {
            await emailService.sendOtpEmail(correo, otp);
        } catch (emailError) {
            console.error('Error al enviar OTP de colaborador:', emailError.message);
        }

        res.json({
            mensaje: 'Código de verificación enviado al correo del colaborador',
            pendingId,
            otp: process.env.NODE_ENV === 'production' ? undefined : otp
        });
    } catch (e) {
        responder.error(res, 500, 'Error al solicitar creación', e, 'Error al solicitar creación de colaborador:');
    }
};

// Se utiliza para el móvil
exports.confirmarCreacion = async (req, res) => {
    try {
        const { pendingId, otp } = req.body;
        if (!pendingId || !otp) {
            return res.status(400).json({ mensaje: 'Código y ID requeridos' });
        }

        const pending = pendingColaboradores.get(pendingId);
        if (!pending) {
            return res.status(400).json({ mensaje: 'Solicitud expirada o inválida' });
        }
        if (Date.now() > pending.expiresAt) {
            pendingColaboradores.delete(pendingId);
            return res.status(400).json({ mensaje: 'El código ha expirado' });
        }
        if (pending.otp !== otp) {
            return res.status(400).json({ mensaje: 'Código incorrecto' });
        }

        const id = await model.create(pending.datos);
        pendingColaboradores.delete(pendingId);

        res.status(201).json({ id_colaborador: id, mensaje: 'Colaborador creado correctamente' });
    } catch (e) {
        console.error('Error al confirmar creación de colaborador:', e);
        res.status(500).json({ mensaje: e.message });
    }
};

// Se utiliza para el móvil
exports.create = async (req, res) => {
    try {
        const check = validarPassword(req.body.password, {
            nombres: req.body.nombres, usuario: req.body.usuario, correo: req.body.correo
        });
        if (!check.valida) {
            return res.status(400).json({ mensaje: check.mensaje });
        }
        const id = await model.create(req.body);
        res.status(201).json({ id_colaborador: id, mensaje: 'Colaborador creado correctamente' });
    } catch (e) {
        responder.error(res, 500, e.message);
    }
};

// Se utiliza para el móvil
exports.update = async (req, res) => {
    try {
        await model.update(req.params.id, req.body);
        res.json({ mensaje: 'Colaborador actualizado correctamente' });
    } catch (e) {
        responder.error(res, 500, e.message);
    }
};

// Se utiliza para el móvil
exports.resetPassword = async (req, res) => {
    try {
        const datos = await model.getDatosParaPassword(req.params.id);
        if (!datos) return res.status(404).json({ mensaje: 'Colaborador no encontrado' });

        const check = validarPassword(req.body.nuevaPassword, {
            nombres: datos.nombres, usuario: datos.usuario, correo: datos.correo
        });
        if (!check.valida) {
            return res.status(400).json({ mensaje: check.mensaje });
        }

        // Se utiliza para el móvil
        const repiteActual = await bcrypt.compare(req.body.nuevaPassword, datos.password);
        const repiteAnterior = datos.password_anterior
            ? await bcrypt.compare(req.body.nuevaPassword, datos.password_anterior)
            : false;
        if (repiteActual || repiteAnterior) {
            return res.status(400).json({
                mensaje: 'No puedes usar la misma contraseña que ya tenías antes.'
            });
        }

        await model.resetPassword(req.params.id, req.body.nuevaPassword);
        res.json({ mensaje: 'Contraseña restablecida correctamente' });
    } catch (e) {
        responder.error(res, 500, e.message);
    }
};

// Se utiliza para el móvil
exports.eliminar = async (req, res) => {
    try {
        await model.eliminar(req.params.id);
        res.json({ mensaje: 'Colaborador eliminado correctamente' });
    } catch (e) {
        if (e.codigo === 'DEBE_DESACTIVAR') {
            return res.status(409).json({ mensaje: e.message });
        }
        if (e.message === 'Colaborador no encontrado') {
            return res.status(404).json({ mensaje: e.message });
        }
        console.error('Error al eliminar colaborador:', e);
        res.status(500).json({ mensaje: 'Error al eliminar colaborador' });
    }
};