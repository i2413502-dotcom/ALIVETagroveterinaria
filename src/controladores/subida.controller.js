const minioService = require('../servicios/minio.service');
const responder = require('../utils/responder');

// Sube una imagen de producto a Cloudflare R2 y devuelve su URL pública.
async function subirImagenProducto(req, res) {
    if (!req.file) {
        return res.status(400).json({ mensaje: 'No se recibió imagen' });
    }

    try {
        const url = await minioService.uploadFile(
            req.file.buffer,
            req.file.originalname,
            'productos'
        );

        res.json({ url: url, mensaje: 'Imagen subida correctamente' });
    } catch (error) {
        responder.error(res, 500, 'Error al subir imagen', error, 'Error subiendo a R2:');
    }
}

module.exports = { subirImagenProducto };
