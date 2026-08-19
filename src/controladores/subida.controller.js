const minioService = require('../servicios/minio.service');

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
        console.error('Error subiendo a R2:', error);
        res.status(500).json({ mensaje: 'Error al subir imagen' });
    }
}

// Sube la ficha técnica (PDF) de un medicamento a Cloudflare R2 y
// devuelve su URL pública. Misma lógica que subirImagenProducto, pero
// guardada en su propia carpeta dentro del bucket.
async function subirFichaTecnica(req, res) {
    if (!req.file) {
        return res.status(400).json({ mensaje: 'No se recibió el PDF' });
    }

    try {
        const url = await minioService.uploadFile(
            req.file.buffer,
            req.file.originalname,
            'fichas-tecnicas'
        );

        res.json({ url: url, mensaje: 'Ficha técnica subida correctamente' });
    } catch (error) {
        console.error('Error subiendo ficha técnica a R2:', error);
        res.status(500).json({ mensaje: 'Error al subir la ficha técnica' });
    }
}

module.exports = { subirImagenProducto, subirFichaTecnica };
