const bcrypt     = require('bcrypt');
const jwt        = require('jsonwebtoken');
const authModel  = require('../modelos/auth.model');
const emailService = require('../servicios/email.service');

// Almacén temporal de registros pendientes de verificación por OTP
// (en producción conviene usar Redis con expiración nativa en vez de memoria)
const pendingRegistrations = new Map();

const login = async (req, res) => {
    // IMPORTANTE PARA LA APP MÓVIL: la respuesta de este endpoint
    // (token + cargo) es lo que usuario_service.dart guarda en
    // SharedPreferences al hacer login. El campo `cargo` es el que
    // dashboard_screen.dart lee para decidir si mostrar o esconder
    // las tarjetas de Colaboradores/Promociones/Nuevo producto/etc.
    // Si algún día se cambia el nombre de este campo acá, hay que
    // actualizarlo también en usuario_service.dart (login()).
    try {
        const { correo, password, contrasena } = req.body;
        const pass = password || contrasena;

        const persona = await authModel.findByEmail(correo);
        if (!persona) return res.status(401).json({ mensaje: "Credenciales incorrectas" });

        const valido = await bcrypt.compare(pass, persona.password);
        if (!valido) return res.status(401).json({ mensaje: "Credenciales incorrectas" });

        let rol = null;
        const colaborador = await authModel.findColaborador(persona.id_persona);
        const cliente = await authModel.findCliente(persona.id_persona);

        if (colaborador) rol = 'COLABORADOR';
        else if (cliente) rol = 'CLIENTE';

        // El cargo (Administrador/Gerente/Vendedor/Asistente de ventas)
        // va DENTRO del token para que verificarCargo() lo pueda leer
        // sin tener que consultar la base en cada request.
        const cargo = colaborador ? colaborador.cargo : null;

        const token = jwt.sign(
            { id: persona.id_persona, rol, cargo },
            process.env.JWT_SECRET,
            { expiresIn: '30m' }
        );

        res.json({
            token,
            rol,
            cargo,
            nombre: persona.nombres,
            apellido: persona.apellido_paterno
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error en login" });
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

module.exports = { login, register, verifyOtp };
