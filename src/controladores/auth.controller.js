const crypto     = require('crypto');
const bcrypt     = require('bcrypt');
const jwt        = require('jsonwebtoken');
const authModel  = require('../modelos/auth.model');
const emailService = require('../servicios/email.service');
const { validarPassword } = require('../utils/passwordPolicy');
const { validarCorreoExiste } = require('../utils/emailValidator');
const responder = require('../utils/responder');
const firebaseAdmin = require('../config/firebase');

// Almacén temporal de registros pendientes de verificación por OTP
// (en producción conviene usar Redis con expiración nativa en vez de memoria)
const pendingRegistrations = new Map();

// Límite de intentos de login fallidos por IP — aplica tanto a
// colaboradores como a clientes (antes solo protegía al panel
// admin; ahora protege el login de cualquier rol por igual).
const intentosLoginPorIp = new Map();
const VENTANA_BLOQUEO_MS = 15 * 60 * 1000; // 15 minutos
const MAX_INTENTOS = 5;

function estaBloqueadoPorIntentos(ip) {
    const registro = intentosLoginPorIp.get(ip);
    if (!registro) return false;
    if (Date.now() > registro.expiresAt) {
        intentosLoginPorIp.delete(ip);
        return false;
    }
    return registro.count >= MAX_INTENTOS;
}

function registrarIntentoFallido(ip) {
    const registro = intentosLoginPorIp.get(ip);
    if (!registro || Date.now() > registro.expiresAt) {
        intentosLoginPorIp.set(ip, { count: 1, expiresAt: Date.now() + VENTANA_BLOQUEO_MS });
    } else {
        registro.count += 1;
    }
}

// Se utiliza para el móvil
const pendingLogins = new Map();
const VENTANA_OTP_LOGIN_MS = 10 * 60 * 1000; // 10 minutos

function generarTokenParaPersona(persona, colaborador, rol) {
    const cargo = colaborador ? colaborador.cargo : null;
    // Colaboradores manejan datos sensibles del negocio → sesión corta (2h).
    // Clientes solo compran → sesión sin vencimiento, se quedan logueados.
    const opciones = rol === 'CLIENTE' ? {} : { expiresIn: '2h' };
    const token = jwt.sign(
        { id: persona.id_persona, rol, cargo },
        process.env.JWT_SECRET,
        opciones
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

        if (estaBloqueadoPorIntentos(ip)) {
            return res.status(429).json({
                mensaje: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en unos minutos.'
            });
        }

        if (!persona) return res.status(401).json({ mensaje: "Credenciales incorrectas" });

        // Cuenta desactivada por un administrador (ver módulo Clientes del
        // panel admin): no debe poder iniciar sesión, con mensaje claro
        // (distinto de "credenciales incorrectas" para no confundir al
        // cliente con una contraseña equivocada).
        if (persona.estado === 'INACTIVO') {
            return res.status(403).json({ mensaje: "Tu cuenta está desactivada. Contacta con la tienda si crees que es un error." });
        }

        const valido = await bcrypt.compare(pass, persona.password);
        if (!valido) {
            registrarIntentoFallido(ip);
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

        // Antes de generar y enviar el OTP: verificar que el dominio del
        // correo pueda recibir mensajes (evita mandar el código a un
        // dominio inexistente o mal escrito, y el "hay demoras" que
        // reportaste al enterarte tarde de que el correo no existía).
        const chequeoCorreo = await validarCorreoExiste(correo);
        if (!chequeoCorreo.valido) {
            return res.status(400).json({ mensaje: chequeoCorreo.motivo });
        }

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
            process.env.JWT_SECRET
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

// Validación "en vivo" mientras el usuario escribe el correo en el
// formulario (antes de enviar el formulario completo). GET /api/auth/validar-correo?correo=...
const validarCorreo = async (req, res) => {
    const { correo } = req.query;
    if (!correo) return res.status(400).json({ valido: false, motivo: 'Falta el correo' });
    const resultado = await validarCorreoExiste(correo);
    res.json(resultado);
};

// Comprueba si un correo YA está registrado en el sistema.
// Se usa en "Recuperar contraseña" para avisar en vivo si esa cuenta
// existe o no.
//
// ⚠️ Nota de seguridad: a diferencia de forgotPasswordOtp (que
// deliberadamente responde siempre el mismo mensaje genérico para no
// filtrar qué correos están registrados), este endpoint SÍ revela esa
// información porque así se pidió explícitamente para la UX de
// recuperación. Para mitigar el riesgo de que alguien lo use para
// enumerar cuentas, se limita por IP igual que el login.
// GET /api/auth/existe-correo?correo=...
const intentosExisteCorreoPorIp = new Map();
const existeCorreo = async (req, res) => {
    const { correo } = req.query;
    if (!correo) return res.status(400).json({ mensaje: 'Falta el correo' });

    const ip = req.ip;
    const registro = intentosExisteCorreoPorIp.get(ip);
    const ahora = Date.now();
    if (registro && ahora < registro.expiresAt && registro.count >= 20) {
        return res.status(429).json({ mensaje: 'Demasiadas consultas, intenta más tarde' });
    }
    if (!registro || ahora > registro.expiresAt) {
        intentosExisteCorreoPorIp.set(ip, { count: 1, expiresAt: ahora + 10 * 60 * 1000 });
    } else {
        registro.count += 1;
    }

    const persona = await authModel.findByEmail(correo);
    res.json({ existe: !!persona });
};

// Login / registro con Google (Firebase Auth).
// El cliente firma con Google en el navegador vía Firebase y nos manda
// el idToken; aquí lo verificamos con Firebase Admin (ya inicializado
// en src/config/firebase.js con las mismas credenciales que usa FCM).
const googleAuth = async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) return res.status(400).json({ mensaje: 'Token de Google requerido' });

        if (!firebaseAdmin.auth) {
            return res.status(503).json({ mensaje: 'Inicio de sesión con Google no disponible en este momento' });
        }

        let decoded;
        try {
            decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
        } catch (e) {
            return res.status(401).json({ mensaje: 'Token de Google inválido o expirado' });
        }

        const correo = decoded.email;
        if (!correo) {
            return res.status(400).json({ mensaje: 'La cuenta de Google no tiene un correo asociado' });
        }

        let persona = await authModel.findByEmail(correo);

        // Primera vez con Google: crea la cuenta como CLIENTE automáticamente.
        // El documento (DNI/RUC) queda pendiente; se completa luego en "Mi perfil".
        if (!persona) {
            const nombreCompleto = (decoded.name || correo.split('@')[0]).trim();
            const passwordAleatoria = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

            const idPersona = await authModel.createPersona({
                nombres: nombreCompleto,
                apellidoPaterno: '',
                apellidoMaterno: '',
                telefono: null,
                correo,
                password: passwordAleatoria
            });
            await authModel.createCliente(idPersona, null, null);

            try {
                await emailService.sendWelcomeEmail(correo, nombreCompleto);
            } catch (e) {
                console.error('Error al enviar bienvenida (Google):', e.message);
            }

            persona = await authModel.findByEmail(correo);
        }

        if (persona.estado === 'INACTIVO') {
            return res.status(403).json({ mensaje: 'Tu cuenta está desactivada. Contacta con la tienda si crees que es un error.' });
        }

        const colaborador = await authModel.findColaborador(persona.id_persona);
        if (colaborador) {
            // Los colaboradores mantienen su flujo propio (usuario/contraseña + OTP corporativo).
            return res.status(403).json({ mensaje: 'Los colaboradores deben iniciar sesión con su usuario y contraseña.' });
        }

        const cliente = await authModel.findCliente(persona.id_persona);
        if (!cliente) {
            return res.status(403).json({ mensaje: 'Cuenta sin rol asignado, contacta con soporte.' });
        }

        res.json(generarTokenParaPersona(persona, null, 'CLIENTE'));

    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'Error al iniciar sesión con Google' });
    }
};

module.exports = { login, loginVerificarOtp, register, verifyOtp, validarCorreo, existeCorreo, googleAuth };
