const db          = require('../config/db');
const bcrypt       = require('bcrypt');
const jwt          = require('jsonwebtoken');
const authModel     = require('../modelos/auth.model');
const emailService  = require('../servicios/email.service');

// Almacén temporal de OTPs para recuperación de contraseña
const pendingPasswordResets = new Map();

// Solicitar recuperación de contraseña (por enlace)
const forgotPassword = async (req, res) => {
    try {
        const { correo } = req.body;

        if (!correo) {
            return res.status(400).json({ mensaje: "Correo requerido" });
        }

        const persona = await authModel.findByEmail(correo);
        if (!persona) {
            // Por seguridad, no revelamos si el correo existe o no
            return res.json({ mensaje: "Si el correo está registrado, recibirás un enlace" });
        }

        const resetToken = jwt.sign(
            { id: persona.id_persona, tipo: 'reset' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Derivar URL base del request (funciona en local y producción sin env vars)
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host     = req.headers['x-forwarded-host']  || req.get('host');
        const baseUrl  = `${protocol}://${host}`;

        await emailService.sendPasswordReset(correo, resetToken, baseUrl);

        res.json({ mensaje: "Si el correo está registrado, recibirás un enlace" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: "Error al procesar solicitud" });
    }
};

// Restablecer contraseña con token de enlace
const resetPassword = async (req, res) => {
    try {
        const { token, nuevaPassword } = req.body;

        if (!token || !nuevaPassword) {
            return res.status(400).json({ mensaje: "Token y nueva contraseña requeridos" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.tipo !== 'reset') {
            return res.status(400).json({ mensaje: "Token inválido" });
        }

        const hash = await bcrypt.hash(nuevaPassword, 10);
        await db.query('UPDATE persona SET password = ? WHERE id_persona = ?', [hash, decoded.id]);

        res.json({ mensaje: "Contraseña restablecida correctamente" });

    } catch (err) {
        console.error(err);
        res.status(400).json({ mensaje: "Token inválido o expirado" });
    }
};

// Solicitar recuperación por código OTP
const forgotPasswordOtp = async (req, res) => {
    try {
        const { correo } = req.body;
        if (!correo) return res.status(400).json({ mensaje: 'Correo requerido' });

        const persona = await authModel.findByEmail(correo);
        if (!persona) {
            return res.json({ mensaje: 'Si el correo está registrado, recibirás un código' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const pendingId = Date.now().toString(36) + Math.random().toString(36).substr(2);

        pendingPasswordResets.set(pendingId, {
            id_persona: persona.id_persona,
            otp,
            expiresAt: Date.now() + 15 * 60 * 1000
        });

        setTimeout(() => pendingPasswordResets.delete(pendingId), 15 * 60 * 1000);

        try {
            await emailService.sendPasswordResetOtp(correo, otp);
        } catch (e) {
            console.error('Error al enviar OTP de recuperación:', e.message);
        }

        res.json({
            mensaje: 'Si el correo está registrado, recibirás un código',
            pendingId,
            otp: process.env.NODE_ENV === 'production' ? undefined : otp
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'Error al procesar solicitud' });
    }
};

// Restablecer contraseña con OTP
const resetPasswordOtp = async (req, res) => {
    try {
        const { pendingId, otp, nuevaPassword, ultimaPassword } = req.body;

        if (!pendingId || !otp || !nuevaPassword) {
            return res.status(400).json({ mensaje: 'Datos incompletos' });
        }

        if (nuevaPassword.length < 6) {
            return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres' });
        }

        const pending = pendingPasswordResets.get(pendingId);
        if (!pending) {
            return res.status(400).json({ mensaje: 'Código expirado o inválido. Solicita uno nuevo.' });
        }

        if (Date.now() > pending.expiresAt) {
            pendingPasswordResets.delete(pendingId);
            return res.status(400).json({ mensaje: 'El código ha expirado. Solicita uno nuevo.' });
        }

        if (pending.otp !== otp) {
            return res.status(400).json({ mensaje: 'Código incorrecto' });
        }

        if (ultimaPassword && ultimaPassword.trim() !== '') {
            const persona = await authModel.findPersonaById(pending.id_persona);
            const valido = await bcrypt.compare(ultimaPassword, persona.password);
            if (!valido) {
                return res.status(400).json({ mensaje: 'La última contraseña ingresada no coincide' });
            }
        }

        const hash = await bcrypt.hash(nuevaPassword, 10);
        await db.query('UPDATE persona SET password = ? WHERE id_persona = ?', [hash, pending.id_persona]);

        pendingPasswordResets.delete(pendingId);

        res.json({ mensaje: 'Contraseña restablecida correctamente' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'Error al restablecer contraseña' });
    }
};

// Cambiar contraseña estando logueado (requiere la contraseña actual)
// NOTA: antes decodificaba el JWT manualmente aquí; ahora usa req.usuario
// que ya deja listo el middleware verificarToken (ver auth.routes.js).
const cambiarPassword = async (req, res) => {
    try {
        const { passwordActual, passwordNueva } = req.body;

        const persona = await authModel.findPersonaById(req.usuario.id);
        if (!persona) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const valido = await bcrypt.compare(passwordActual, persona.password);
        if (!valido) return res.status(400).json({ mensaje: 'Contraseña actual incorrecta' });

        const hash = await bcrypt.hash(passwordNueva, 10);
        await db.query('UPDATE persona SET password=? WHERE id_persona=?', [hash, req.usuario.id]);

        res.json({ mensaje: 'Contraseña cambiada correctamente' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'Error al cambiar contraseña' });
    }
};

module.exports = { forgotPassword, resetPassword, forgotPasswordOtp, resetPasswordOtp, cambiarPassword };
