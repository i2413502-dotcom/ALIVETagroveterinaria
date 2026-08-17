const bcrypt     = require('bcrypt');
const jwt        = require('jsonwebtoken');
const authModel  = require('../modelos/auth.model');
const emailService = require('../servicios/email.service');
const { validarPassword, passwordVencida } = require('../utils/passwordPolicy');
const responder = require('../utils/responder');

// Almacén temporal de registros pendientes de verificación por OTP
// (en producción conviene usar Redis con expiración nativa en vez de memoria)
const pendingRegistrations = new Map();

// Se utiliza para el móvil
const intentosColaboradorPorIp = new Map();
const VENTANA_BLOQUEO_MS = 15 * 60 * 1000; // 15 minutos
const MAX_INTENTOS = 10;

function estaBloqueadoPorIntentos(ip) {
    const registro = intentosColaboradorPorIp.get(ip);
    if (!registro) return false;
    if (Date.now() > registro.expiresAt) {
        intentosColaboradorPorIp.delete(ip);
        return false;
    }
    return registro.count >= MAX_INTENTOS;
}

function registrarIntentoFallido(ip) {
    const registro = intentosColaboradorPorIp.get(ip);
    if (!registro || Date.now() > registro.expiresAt) {
        intentosColaboradorPorIp.set(ip, { count: 1, expiresAt: Date.now() + VENTANA_BLOQUEO_MS });
    } else {
        registro.count += 1;
    }
}

// Se utiliza para el móvil
const pendingLogins = new Map();
const VENTANA_OTP_LOGIN_MS = 10 * 60 * 1000; // 10 minutos

function generarTokenParaPersona(persona, colaborador, rol) {
    const cargo = colaborador ? colaborador.cargo : null;
    const token = jwt.sign(
        { id: persona.id_persona, rol, cargo },
        process.env.JWT_SECRET,
        { expiresIn: '30m' }
    );
    return {
        token,
        rol,
        cargo,
        nombre: persona.nombres,
        apellido: persona.apellido_paterno
    };
}

const login = async (req, res) => {
    // Se utiliza para el móvil
    try {
        const { correo, password, contrasena } = req.body;
        const pass = password || contrasena;
        const ip = req.ip;

        const persona = await authModel.findByEmail(correo);

        // Se utiliza para el móvil
        const colaborador = persona ? await authModel.findColaborador(persona.id_persona) : null;

        if (colaborador && estaBloqueadoPorIntentos(ip)) {
            return res.status(429).json({
                mensaje: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en unos minutos.'
            });
        }

        if (!persona) return res.status(401).json({ mensaje: "Credenciales incorrectas" });

        const valido = await bcrypt.compare(pass, persona.password);
        if (!valido) {
            if (colaborador) registrarIntentoFallido(ip);
            return res.status(401).json({ mensaje: "Credenciales incorrectas" });
        }

        let rol = null;
        const cliente = await authModel.findCliente(persona.id_persona);

        if (colaborador) rol = 'COLABORADOR';
        else if (cliente) rol = 'CLIENTE';

        // Se utiliza para el móvil
        if (!colaborador) {
            return res.json(generarTokenParaPersona(persona, colaborador, rol));
        }

        // Se utiliza para el móvil
        if (passwordVencida(persona.password_actualizada_en)) {
            const renewalToken = jwt.sign(
                { id: persona.id_persona, tipo: 'renovar_password' },
                process.env.JWT_SECRET,
                { expiresIn: '15m' }
            );
            return res.status(200).json({
                passwordVencida: true,
                renewalToken,
                mensaje: 'Tu contraseña venció (se renueva cada 60 días). Elige una nueva para continuar.'
            });
        }

        const otp = Math.floor(10000 + Math.random() * 90000).toString();
        const pendingLoginId = Date.now().toString(36) + Math.random().toString(36).substr(2);

        pendingLogins.set(pendingLoginId, {
            idPersona: persona.id_persona,
            otp,
            expiresAt: Date.now() + VENTANA_OTP_LOGIN_MS
        });

        try {
            await emailService.sendOtpEmail(persona.correo, otp);
        } catch (emailError) {
            console.error('Error al enviar OTP de login:', emailError.message);
        }

        res.json({
            requiereOtp: true,
            pendingLoginId,
            mensaje: 'Ingresa el código enviado a tu correo para completar el inicio de sesión'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error en login" });
    }
};

// Se utiliza para el móvil
const renovarPasswordVencida = async (req, res) => {
    try {
        const { renewalToken, passwordNueva } = req.body;
        if (!renewalToken || !passwordNueva) {
            return res.status(400).json({ mensaje: 'Datos incompletos' });
        }

        let decoded;
        try {
            decoded = jwt.verify(renewalToken, process.env.JWT_SECRET);
        } catch (e) {
            return res.status(400).json({ mensaje: 'Token de renovación inválido o vencido, vuelve a iniciar sesión' });
        }
        if (decoded.tipo !== 'renovar_password') {
            return res.status(400).json({ mensaje: 'Token inválido' });
        }

        const persona = await authModel.findPersonaById(decoded.id);
        if (!persona) return res.status(404).json({ mensaje: 'Cuenta no encontrada' });
        const colaborador = await authModel.findColaborador(persona.id_persona);

        const check = validarPassword(passwordNueva, {
            nombres: persona.nombres,
            usuario: colaborador ? colaborador.usuario : null,
            correo: persona.correo
        });
        if (!check.valida) {
            return res.status(400).json({ mensaje: check.mensaje });
        }

        const repiteActual = await bcrypt.compare(passwordNueva, persona.password);
        const repiteAnterior = persona.password_anterior
            ? await bcrypt.compare(passwordNueva, persona.password_anterior)
            : false;
        if (repiteActual || repiteAnterior) {
            return res.status(400).json({
                mensaje: 'No puedes usar la misma contraseña que ya tenías antes.'
            });
        }

        const db = require('../config/db');
        const hash = await bcrypt.hash(passwordNueva, 10);
        await db.query(
            `UPDATE persona
             SET password=?, password_anterior=?, password_actualizada_en=NOW()
             WHERE id_persona=?`,
            [hash, persona.password, persona.id_persona]
        );

        // Se utiliza para el móvil
        const otp = Math.floor(10000 + Math.random() * 90000).toString();
        const pendingLoginId = Date.now().toString(36) + Math.random().toString(36).substr(2);

        pendingLogins.set(pendingLoginId, {
            idPersona: persona.id_persona,
            otp,
            expiresAt: Date.now() + VENTANA_OTP_LOGIN_MS
        });

        try {
            await emailService.sendOtpEmail(persona.correo, otp);
        } catch (emailError) {
            console.error('Error al enviar OTP de login tras renovar contraseña:', emailError.message);
        }

        res.json({
            requiereOtp: true,
            pendingLoginId,
            mensaje: 'Contraseña renovada. Ingresa el código enviado a tu correo para completar el inicio de sesión'
        });
    } catch (error) {
        responder.error(res, 500, 'Error al renovar la contraseña', error, 'Error al renovar contraseña vencida:');
    }
};

// Se utiliza para el móvil
const loginVerificarOtp = async (req, res) => {
    try {
        const { pendingLoginId, otp } = req.body;
        if (!pendingLoginId || !otp) {
            return res.status(400).json({ mensaje: 'Código y ID requeridos' });
        }

        const pending = pendingLogins.get(pendingLoginId);
        if (!pending) {
            return res.status(400).json({ mensaje: 'Solicitud de login expirada o inválida' });
        }
        if (Date.now() > pending.expiresAt) {
            pendingLogins.delete(pendingLoginId);
            return res.status(400).json({ mensaje: 'El código ha expirado, vuelve a iniciar sesión' });
        }
        if (pending.otp !== otp) {
            return res.status(400).json({ mensaje: 'Código incorrecto' });
        }

        const persona = await authModel.findPersonaById(pending.idPersona);
        if (!persona) return res.status(404).json({ mensaje: 'Cuenta no encontrada' });

        const colaborador = await authModel.findColaborador(persona.id_persona);
        pendingLogins.delete(pendingLoginId);

        res.json(generarTokenParaPersona(persona, colaborador, 'COLABORADOR'));
    } catch (error) {
        responder.error(res, 500, 'Error al verificar el código', error, 'Error al verificar OTP de login:');
    }
};

// Paso 1: Registrar y enviar OTP
const register = async (req, res) => {
    try {
        const { nombres, apellidoPaterno, apellidoMaterno,
                telefono, correo, password,
                tipoDocumento, numeroDocumento } = req.body;

        if (!nombres || !correo || !password) {
            return res.status(400).json({ mensaje: "Campos obligatorios faltantes" });
        }

        if (tipoDocumento === 'DNI' && !/^\d{8}$/.test(numeroDocumento || '')) {
            return res.status(400).json({ mensaje: "El DNI debe tener exactamente 8 dígitos numéricos" });
        }
        if (tipoDocumento === 'RUC' && !/^\d{11}$/.test(numeroDocumento || '')) {
            return res.status(400).json({ mensaje: "El RUC debe tener exactamente 11 dígitos numéricos" });
        }
        if (telefono && !/^9\d{8}$/.test(telefono)) {
            return res.status(400).json({ mensaje: "El teléfono debe tener 9 dígitos y empezar con 9" });
        }

        const existe = await authModel.findByEmail(correo);
        if (existe) return res.status(400).json({ mensaje: "Correo ya registrado" });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const pendingId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        pendingRegistrations.set(pendingId, {
            nombres, apellidoPaterno, apellidoMaterno, telefono,
            correo, password, tipoDocumento, numeroDocumento,
            otp,
            expiresAt: Date.now() + 15 * 60 * 1000
        });

        try {
            await emailService.sendOtpEmail(correo, otp);
        } catch (emailError) {
            console.error('Error al enviar OTP:', emailError.message);
        }

        res.json({
            mensaje: "Código de verificación enviado a tu correo",
            pendingId: pendingId,
            otp: process.env.NODE_ENV === 'production' ? undefined : otp
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: "Error en registro" });
    }
};

// Paso 2: Verificar OTP y crear cuenta
const verifyOtp = async (req, res) => {
    try {
        const { pendingId, otp } = req.body;

        if (!pendingId || !otp) {
            return res.status(400).json({ mensaje: "Código y ID requeridos" });
        }

        const pending = pendingRegistrations.get(pendingId);
        if (!pending) {
            return res.status(400).json({ mensaje: "Registro expirado o inválido" });
        }

        if (Date.now() > pending.expiresAt) {
            pendingRegistrations.delete(pendingId);
            return res.status(400).json({ mensaje: "El código ha expirado" });
        }

        if (pending.otp !== otp) {
            return res.status(400).json({ mensaje: "Código incorrecto" });
        }

        const hash = await bcrypt.hash(pending.password, 10);

        const idPersona = await authModel.createPersona({
            nombres: pending.nombres,
            apellidoPaterno: pending.apellidoPaterno,
            apellidoMaterno: pending.apellidoMaterno,
            telefono: pending.telefono,
            correo: pending.correo,
            password: hash
        });

        const idTipoDoc = pending.tipoDocumento === 'RUC' ? 2 : 1;
        await authModel.createCliente(idPersona, idTipoDoc, pending.numeroDocumento);

        pendingRegistrations.delete(pendingId);

        try {
            await emailService.sendWelcomeEmail(pending.correo, pending.nombres);
        } catch (e) {
            console.error('Error al enviar bienvenida:', e.message);
        }

        const token = jwt.sign(
            { id: idPersona, rol: 'CLIENTE' },
            process.env.JWT_SECRET,
            { expiresIn: '30m' }
        );

        res.json({
            mensaje: "Registro exitoso",
            token,
            rol: 'CLIENTE',
            nombre: pending.nombres
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: "Error al verificar código" });
    }
};

module.exports = { login, loginVerificarOtp, renovarPasswordVencida, register, verifyOtp };
