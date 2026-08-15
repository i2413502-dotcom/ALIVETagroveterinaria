const db = require('../config/db');
const authModel    = require('../modelos/auth.model');
const emailService = require('../servicios/email.service');
const minioService  = require('../servicios/minio.service');

// Enviar promoción a un cliente específico o a todos.
//
// NOTA: esta ruta no tenía NINGÚN middleware de autenticación en
// app.js/auth.routes.js — cualquiera podía mandar correos masivos a
// toda la base de clientes sin haber iniciado sesión. Ya se protegió
// en las rutas (verificarToken + verificarRol('COLABORADOR')); el
// frontend (public/js/promociones.js) ya enviaba el token, así que
// esto no rompe la pantalla existente.
//
// También se corrigió que la imagen que el admin adjunta en el
// formulario se subía a memoria (multer) pero nunca se usaba: ahora
// se sube a Cloudflare R2 y su URL se incrusta en el correo.
const enviarPromocion = async (req, res) => {
    try {
        const { correo, asunto, mensaje } = req.body;

        if (!asunto || !mensaje) {
            return res.status(400).json({ mensaje: "Asunto y mensaje requeridos" });
        }

        let imagenUrl = null;
        if (req.file) {
            imagenUrl = await minioService.uploadFile(req.file.buffer, req.file.originalname, 'promociones');
        }

        if (correo) {
            const persona = await authModel.findByEmail(correo);
            if (!persona) return res.status(404).json({ mensaje: "Cliente no encontrado" });
            await emailService.sendPromotion(correo, persona.nombres, asunto, mensaje, imagenUrl);
        } else {
            const [clientes] = await db.query(
                `SELECT p.correo, p.nombres FROM persona p
                 JOIN cliente c ON c.id_persona = p.id_persona`
            );
            for (const c of clientes) {
                await emailService.sendPromotion(c.correo, c.nombres, asunto, mensaje, imagenUrl);
            }
        }

        res.json({ mensaje: "Promoción enviada" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: "Error al enviar promoción" });
    }
};

module.exports = { enviarPromocion };
