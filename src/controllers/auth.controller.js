const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authModel = require('../models/auth.model');
const crypto = require('crypto');
const emailService = require('../services/email.service');
const API_PERU_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6ImkyNDEzNTAyQGNvbnRpbmVudGFsLmVkdS5wZSJ9.nI0hFsGrlk9vbeXXCZVfWQjP__LIX1C7iiLGVxqsRhM';
const BASE_URL = 'https://dniruc.apisperu.com/api/v1';

const login = async (req, res) => {
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

        const token = jwt.sign(
            { id: persona.id_persona, rol },
            process.env.JWT_SECRET,
            { expiresIn: '4h' }
        );

        res.json({ 
            token, 
            rol, 
            nombre: persona.nombres,
            apellido: persona.apellido_paterno
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error en login" });
    }
};

// Almacén temporal de registros pendientes (en producción usa Redis o BD)
const pendingRegistrations = new Map();

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

        // Generar OTP de 6 dígitos
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Guardar datos temporalmente (15 minutos)
        const pendingId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        pendingRegistrations.set(pendingId, {
            nombres, apellidoPaterno, apellidoMaterno, telefono,
            correo, password, tipoDocumento, numeroDocumento,
            otp,
            expiresAt: Date.now() + 15 * 60 * 1000
        });

        // Enviar OTP por correo
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

        // Crear usuario
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

        // Limpiar registro pendiente
        pendingRegistrations.delete(pendingId);

        // Enviar correo de bienvenida
        try {
            await emailService.sendWelcomeEmail(pending.correo, pending.nombres);
        } catch (e) {
            console.error('Error al enviar bienvenida:', e.message);
        }

        const token = jwt.sign(
            { id: idPersona, rol: 'CLIENTE' },
            process.env.JWT_SECRET,
            { expiresIn: '4h' }
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

const consultarDocumento = async (req, res) => {
    try {
        const { tipo, numero } = req.query;

        if (!tipo || !numero) {
            return res.status(400).json({ success: false, mensaje: 'Faltan parámetros' });
        }

        // 1. Ajustamos la URL según la imagen de tu documentación
        const endpoint = tipo.toLowerCase(); 
        const url = `https://dniruc.apisperu.com/api/v1/${endpoint}/${numero}?token=${API_PERU_TOKEN}`;

        console.log("Consultando a:", url); // Para depuración

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        console.log("Respuesta de Apis Perú:", data);

        // 2. Validación flexible de la respuesta
        // Nota: Algunos planes de Apis Perú devuelven el objeto directo, otros dentro de 'data'
        const info = data.data || data; 

        if (tipo === 'DNI' && (info.nombres || info.nombre_completo)) {
            return res.json({
                success: true,
                nombres: info.nombres,
                apellidoPaterno: info.apellido_paterno || info.apellidoPaterno,
                apellidoMaterno: info.apellido_materno || info.apellidoMaterno,
                nombreCompleto: info.nombre_completo
            });
        } else if (tipo === 'RUC' && (info.razon_social || info.nombre_o_razon_social || info.razonSocial)) {
            return res.json({
                success: true,
                razonSocial: info.razon_social || info.nombre_o_razon_social || info.razonSocial,
                direccion: info.direccion_completa || info.direccion
            });
        }

        // Si llega aquí es porque la API respondió pero no trajo datos de persona/empresa
        return res.json({
            success: false,
            mensaje: `No se encontró el ${tipo}, ingresa tus datos manualmente`
        });

    } catch (error) {
        console.error("Error en el servidor:", error);
        res.status(500).json({ success: false, mensaje: 'Error de conexión con el servicio' });
    }
};

const getPerfil = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ mensaje: 'No autorizado' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const persona = await authModel.findPersonaById(decoded.id);

        if (!persona) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        res.json({
            id_persona: persona.id_persona,
            nombres: persona.nombres,
            apellido_paterno: persona.apellido_paterno,
            apellido_materno: persona.apellido_materno,
            correo: persona.correo,
            telefono: persona.telefono,
            numero_documento: persona.numero_documento,
            tipo_documento: persona.tipo_documento
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'Error al obtener perfil' });
    }
};

const getDatosEnvio = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ mensaje: 'No autorizado' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const [rows] = await db.query(
            `SELECT per.nombres, per.apellido_paterno, per.apellido_materno,
                    per.telefono, per.correo,
                    cli.numero_documento, td.nombre AS tipo_documento,
                    cli.direccion_habitual, cli.referencia_habitual
             FROM persona per
             JOIN cliente cli ON cli.id_persona = per.id_persona
             LEFT JOIN tipo_documento td ON cli.id_tipo_documento = td.id_tipo_documento
             WHERE per.id_persona = ?`,
            [decoded.id]
        );

        if (!rows.length) return res.status(404).json({ mensaje: 'Cliente no encontrado' });
        res.json(rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'Error al obtener datos' });
    }
};

const guardarDireccionHabitual = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ mensaje: 'No autorizado' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { direccion, referencia, telefono } = req.body;

        // Validación de teléfono (si llega desde el checkout)
        if (telefono && !/^9\d{8}$/.test(telefono)) {
            return res.status(400).json({ mensaje: 'El teléfono debe tener 9 dígitos y empezar con 9' });
        }

        const [clienteRows] = await db.query(
            'SELECT id_cliente FROM cliente WHERE id_persona = ?', [decoded.id]
        );
        if (!clienteRows.length) return res.status(404).json({ mensaje: 'Cliente no encontrado' });

        await db.query(
            'UPDATE cliente SET direccion_habitual = ?, referencia_habitual = ? WHERE id_persona = ?',
            [direccion || null, referencia || null, decoded.id]
        );

        // Persistir el teléfono en el perfil del cliente (antes solo vivía en el pedido)
        if (telefono) {
            await db.query(
                'UPDATE persona SET telefono = ? WHERE id_persona = ?',
                [telefono, decoded.id]
            );
        }

        res.json({ mensaje: 'Dirección guardada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'Error al guardar dirección' });
    }
};

const actualizarPerfil = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ mensaje: 'No autorizado' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { nombres, apellido_paterno, apellido_materno, telefono } = req.body;

        // Validación de teléfono (9 dígitos, empieza con 9)
        if (telefono && !/^9\d{8}$/.test(telefono)) {
            return res.status(400).json({ mensaje: "El teléfono debe tener 9 dígitos y empezar con 9" });
        }

        await db.query(
            `UPDATE persona SET nombres=?, apellido_paterno=?,
             apellido_materno=?, telefono=? WHERE id_persona=?`,
            [nombres, apellido_paterno, apellido_materno, telefono, decoded.id]
        );

        res.json({ mensaje: 'Perfil actualizado correctamente' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'Error al actualizar perfil' });
    }
};

const cambiarPassword = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ mensaje: 'No autorizado' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { passwordActual, passwordNueva } = req.body;

        const persona = await authModel.findPersonaById(decoded.id);
        if (!persona) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

        const valido = await bcrypt.compare(passwordActual, persona.password);
        if (!valido) return res.status(400).json({ mensaje: 'Contraseña actual incorrecta' });

        const hash = await bcrypt.hash(passwordNueva, 10);
        await db.query(
            'UPDATE persona SET password=? WHERE id_persona=?',
            [hash, decoded.id]
        );

        res.json({ mensaje: 'Contraseña cambiada correctamente' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'Error al cambiar contraseña' });
    }
};

const guardarFcmToken = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ mensaje: 'No autorizado' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { fcm_token } = req.body;

        await db.query(
            'UPDATE colaborador SET fcm_token = ? WHERE id_persona = ?',
            [fcm_token, decoded.id]
        );
        res.json({ mensaje: 'Token FCM guardado' });
    } catch (err) {
        res.status(500).json({ mensaje: 'Error al guardar token FCM' });
    }
};
// Solicitar recuperación de contraseña
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

        // Generar token de recuperación (válido por 1 hora)
        const resetToken = jwt.sign(
            { id: persona.id_persona, tipo: 'reset' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Enviar correo de recuperación
        await emailService.sendPasswordReset(correo, resetToken);

        res.json({ mensaje: "Si el correo está registrado, recibirás un enlace" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: "Error al procesar solicitud" });
    }
};

// Restablecer contraseña con token
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
};// Enviar promoción a un cliente o a todos
const enviarPromocion = async (req, res) => {
    try {
        const { correo, asunto, mensaje } = req.body;

        if (!asunto || !mensaje) {
            return res.status(400).json({ mensaje: "Asunto y mensaje requeridos" });
        }

        if (correo) {
            // Enviar a un cliente específico
            const persona = await authModel.findByEmail(correo);
            if (!persona) return res.status(404).json({ mensaje: "Cliente no encontrado" });
            await emailService.sendPromotion(correo, persona.nombres, asunto, mensaje);
        } else {
            // Enviar a todos los clientes
            const [clientes] = await db.query(
                `SELECT p.correo, p.nombres FROM persona p 
                 JOIN cliente c ON c.id_persona = p.id_persona`
            );
            for (const c of clientes) {
                await emailService.sendPromotion(c.correo, c.nombres, asunto, mensaje);
            }
        }

        res.json({ mensaje: "Promoción enviada" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: "Error al enviar promoción" });
    }
};
module.exports = { 
    login, 
    register, 
    verifyOtp, 
    forgotPassword, 
    resetPassword, 
    enviarPromocion, 
    consultarDocumento, 
    getPerfil, 
    getDatosEnvio, 
    guardarDireccionHabitual, 
    actualizarPerfil, 
    cambiarPassword, 
    guardarFcmToken 
};