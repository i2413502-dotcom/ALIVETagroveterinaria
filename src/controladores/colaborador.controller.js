const model = require('../modelos/colaborador.model');

const emailService = require('../servicios/email.service');
const bcrypt = require('bcrypt');
const authModel = require('../modelos/auth.model');
const { validarPassword } = require('../utils/passwordPolicy');

const pendingColaboradores = new Map();

exports.getAll = async (req, res) => {
    try { res.json(await model.getAll()); }
    catch (e) { res.status(500).json({ mensaje: e.message }); }
};

exports.getCargos = async (req, res) => {
    try { res.json(await model.getCargos()); }
    catch (e) { res.status(500).json({ mensaje: e.message }); }
};

// Se utiliza para el móvil
exports.solicitarCreacion = async (req, res) => {
    try {
        const { correo, password, nombres } = req.body;
        if (!correo) return res.status(400).json({ mensaje: 'Correo requerido' });

        const datos = { ...req.body };
        if (!datos.usuario || !datos.usuario.trim()) {
            datos.usuario = await generarUsuarioDesdeCorreo(correo);
        }

        const check = validarPassword(password, { nombres, usuario: datos.usuario, correo });
        if (!check.valida) {
            return res.status(400).json({ mensaje: check.mensaje });
        }

        const otp = Math.floor(10000 + Math.random() * 90000).toString();
        const pendingId = Date.now().toString(36) + Math.random().toString(36).substr(2);

        pendingColaboradores.set(pendingId, {
            datos,
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
        console.error('Error al solicitar creación de colaborador:', e);
        res.status(500).json({ mensaje: 'Error al solicitar creación' });
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

// Genera un "usuario" a partir del correo (parte antes de la @) cuando
// el formulario ya no lo pide. Ej: "rebeca@gmail.com" -> "rebeca".
// Si dos colaboradores comparten esa parte del correo, se le agrega un
// sufijo numérico para no chocar (no hay UNIQUE en BD, pero así se evita
// confusión con usuarios idénticos).
async function generarUsuarioDesdeCorreo(correo) {
    const base = (correo || 'usuario').split('@')[0].toLowerCase().trim() || 'usuario';
    let candidato = base;
    let intento = 1;
    while (await model.usuarioExiste(candidato)) {
        intento += 1;
        candidato = `${base}${intento}`;
    }
    return candidato;
}

// Se utiliza para el móvil
exports.create = async (req, res) => {
    try {
        const datos = { ...req.body };
        if (!datos.usuario || !datos.usuario.trim()) {
            datos.usuario = await generarUsuarioDesdeCorreo(datos.correo);
        }
        const check = validarPassword(datos.password, {
            nombres: datos.nombres, usuario: datos.usuario, correo: datos.correo
        });
        if (!check.valida) {
            return res.status(400).json({ mensaje: check.mensaje });
        }
        const id = await model.create(datos);
        res.status(201).json({ id_colaborador: id, mensaje: 'Colaborador creado correctamente' });
    } catch (e) { res.status(500).json({ mensaje: e.message }); }
};

// Se utiliza para el móvil
exports.update = async (req, res) => {
    try {
        await model.update(req.params.id, req.body);
        res.json({ mensaje: 'Colaborador actualizado correctamente' });
    } catch (e) { res.status(500).json({ mensaje: e.message }); }
};

// ── Cambio de contraseña de un colaborador, mismo flujo que "Mi perfil" ──
// (contraseña actual -> valida -> envía OTP al correo -> confirmar OTP)
// Se guarda en memoria igual que pendingColaboradores, expira en 15 min.
const pendingResetsColaborador = new Map();

// Paso 1: valida TU contraseña (la del admin logueado, no la del
// colaborador que estás editando — así funciona igual si editas tu
// propia cuenta o la de otra persona) y la política de la nueva, y
// manda el código OTP al correo del COLABORADOR (el que recibe el
// cambio). NO cambia nada todavía.
// Se utiliza para el móvil y para el panel web (Editar Colaborador).
exports.solicitarResetPassword = async (req, res) => {
    try {
        const { passwordActual, passwordNueva } = req.body;
        if (!passwordActual || !passwordNueva) {
            return res.status(400).json({ mensaje: 'Tu contraseña actual y la nueva son requeridas' });
        }

        const datos = await model.getDatosParaPassword(req.params.id);
        if (!datos) return res.status(404).json({ mensaje: 'Colaborador no encontrado' });

        // OJO: se valida la contraseña de QUIEN está haciendo el cambio
        // (el admin logueado, req.usuario.id), no la del colaborador
        // que se está editando — de lo contrario, un admin nunca podría
        // resetearle la clave a otra persona sin saber la de ella.
        const admin = await authModel.findPersonaById(req.usuario.id);
        if (!admin) return res.status(404).json({ mensaje: 'No se pudo verificar tu usuario' });

        const passwordValida = await bcrypt.compare(passwordActual, admin.password);
        if (!passwordValida) {
            return res.status(400).json({ mensaje: 'Tu contraseña actual no es correcta' });
        }

        const check = validarPassword(passwordNueva, {
            nombres: datos.nombres, usuario: datos.usuario, correo: datos.correo
        });
        if (!check.valida) {
            return res.status(400).json({ mensaje: check.mensaje });
        }

        const repiteActual = await bcrypt.compare(passwordNueva, datos.password);
        const repiteAnterior = datos.password_anterior
            ? await bcrypt.compare(passwordNueva, datos.password_anterior)
            : false;
        if (repiteActual || repiteAnterior) {
            return res.status(400).json({
                mensaje: 'No puedes usar la misma contraseña que ya tenías antes.'
            });
        }

        const otp = Math.floor(10000 + Math.random() * 90000).toString();
        const pendingId = Date.now().toString(36) + Math.random().toString(36).substr(2);

        pendingResetsColaborador.set(pendingId, {
            idColaborador: req.params.id,
            passwordAnterior: datos.password,
            passwordNueva,
            otp,
            expiresAt: Date.now() + 15 * 60 * 1000
        });

        try {
            await emailService.sendOtpEmail(datos.correo, otp);
        } catch (e) {
            console.error('Error al enviar OTP de cambio de contraseña (colaborador):', e.message);
        }

        res.json({
            requiereOtp: true,
            pendingId,
            mensaje: 'Ingresa el código enviado al correo del colaborador para confirmar el cambio'
        });
    } catch (e) {
        console.error('Error al solicitar cambio de contraseña de colaborador:', e);
        res.status(500).json({ mensaje: e.message });
    }
};

// Paso 2: confirma el OTP y recién ahí guarda la nueva contraseña.
// Se utiliza para el móvil y para el panel web (Editar Colaborador).
exports.confirmarResetPassword = async (req, res) => {
    try {
        const { pendingId, otp } = req.body;
        if (!pendingId || !otp) {
            return res.status(400).json({ mensaje: 'Código y ID requeridos' });
        }

        const pending = pendingResetsColaborador.get(pendingId);
        if (!pending) {
            return res.status(400).json({ mensaje: 'Solicitud expirada o inválida' });
        }
        if (Date.now() > pending.expiresAt) {
            pendingResetsColaborador.delete(pendingId);
            return res.status(400).json({ mensaje: 'El código ha expirado, vuelve a intentar' });
        }
        if (pending.otp !== otp) {
            return res.status(400).json({ mensaje: 'Código incorrecto' });
        }

        await model.resetPassword(pending.idColaborador, pending.passwordNueva);
        pendingResetsColaborador.delete(pendingId);

        res.json({ mensaje: 'Contraseña cambiada correctamente' });
    } catch (e) {
        console.error('Error al confirmar cambio de contraseña de colaborador:', e);
        res.status(500).json({ mensaje: e.message });
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