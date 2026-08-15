const db = require('../config/db');
const authModel = require('../modelos/auth.model');

// NOTA: las 5 funciones de este archivo antes decodificaban el JWT
// manualmente con jwt.verify(...) dentro de cada una, duplicando el
// trabajo que ya hace el middleware verificarToken (doble verificación
// del mismo token en cada request). Ahora todas usan req.usuario, que
// el middleware deja listo antes de llegar aquí (ver auth.routes.js).

const getPerfil = async (req, res) => {
    try {
        const persona = await authModel.findPersonaById(req.usuario.id);
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
        const [rows] = await db.query(
            `SELECT per.nombres, per.apellido_paterno, per.apellido_materno,
                    per.telefono, per.correo,
                    cli.numero_documento, td.nombre AS tipo_documento,
                    cli.direccion_habitual, cli.referencia_habitual
             FROM persona per
             JOIN cliente cli ON cli.id_persona = per.id_persona
             LEFT JOIN tipo_documento td ON cli.id_tipo_documento = td.id_tipo_documento
             WHERE per.id_persona = ?`,
            [req.usuario.id]
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
        const { direccion, referencia, telefono } = req.body;

        if (telefono && !/^9\d{8}$/.test(telefono)) {
            return res.status(400).json({ mensaje: 'El teléfono debe tener 9 dígitos y empezar con 9' });
        }

        const [clienteRows] = await db.query(
            'SELECT id_cliente FROM cliente WHERE id_persona = ?', [req.usuario.id]
        );
        if (!clienteRows.length) return res.status(404).json({ mensaje: 'Cliente no encontrado' });

        await db.query(
            'UPDATE cliente SET direccion_habitual = ?, referencia_habitual = ? WHERE id_persona = ?',
            [direccion || null, referencia || null, req.usuario.id]
        );

        // Persistir el teléfono en el perfil del cliente (antes solo vivía en el pedido)
        if (telefono) {
            await db.query(
                'UPDATE persona SET telefono = ? WHERE id_persona = ?',
                [telefono, req.usuario.id]
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
        const { nombres, apellido_paterno, apellido_materno, telefono } = req.body;

        if (telefono && !/^9\d{8}$/.test(telefono)) {
            return res.status(400).json({ mensaje: "El teléfono debe tener 9 dígitos y empezar con 9" });
        }

        await db.query(
            `UPDATE persona SET nombres=?, apellido_paterno=?,
             apellido_materno=?, telefono=? WHERE id_persona=?`,
            [nombres, apellido_paterno, apellido_materno, telefono, req.usuario.id]
        );

        res.json({ mensaje: 'Perfil actualizado correctamente' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'Error al actualizar perfil' });
    }
};

const guardarFcmToken = async (req, res) => {
    try {
        const { fcm_token } = req.body;

        await db.query(
            'UPDATE colaborador SET fcm_token = ? WHERE id_persona = ?',
            [fcm_token, req.usuario.id]
        );
        res.json({ mensaje: 'Token FCM guardado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'Error al guardar token FCM' });
    }
};

module.exports = { getPerfil, getDatosEnvio, guardarDireccionHabitual, actualizarPerfil, guardarFcmToken };
