const imagenModel   = require('../modelos/imagen.model');
const productoModel = require('../modelos/producto.model');
const minioService  = require('../servicios/minio.service');
const responder = require('../utils/responder');

// POST /api/imagenes/:idProducto — sube un archivo a R2 y lo asocia al producto
async function subir(req, res) {
    try {
        const { idProducto } = req.params;
        const producto = await productoModel.obtenerProductoPorId(idProducto);
        if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });

        if (!req.file) return res.status(400).json({ mensaje: 'No se recibió ninguna imagen' });

        const url = await minioService.uploadFile(req.file.buffer, req.file.originalname, 'productos');
        const idImagen = await imagenModel.agregar(idProducto, url);

        res.status(201).json({ id_imagen: idImagen, url_imagen: url, mensaje: 'Imagen agregada' });
    } catch (err) {
        responder.error(res, 500, 'Error al subir la imagen', err, 'Error subiendo imagen:');
    }
}

// GET /api/imagenes/:idProducto — galería completa de un producto (pública)
async function listar(req, res) {
    try {
        const imagenes = await imagenModel.listarPorProducto(req.params.idProducto);
        res.json(imagenes);
    } catch (err) {
        responder.error(res, 500, 'Error al obtener imágenes', err, 'Error obteniendo imágenes:');
    }
}

// PUT /api/imagenes/:id/principal — cambia cuál imagen se muestra primero
async function marcarPrincipal(req, res) {
    try {
        const imagen = await imagenModel.obtenerPorId(req.params.id);
        if (!imagen) return res.status(404).json({ mensaje: 'Imagen no encontrada' });

        await imagenModel.marcarPrincipal(imagen.id_imagen, imagen.id_producto);
        res.json({ mensaje: 'Imagen marcada como principal' });
    } catch (err) {
        responder.error(res, 500, 'Error al actualizar', err, 'Error marcando imagen principal:');
    }
}

// DELETE /api/imagenes/:id — borra la fila y, si es de R2, también el archivo
async function eliminar(req, res) {
    try {
        const imagen = await imagenModel.obtenerPorId(req.params.id);
        if (!imagen) return res.status(404).json({ mensaje: 'Imagen no encontrada' });

        await imagenModel.eliminar(imagen.id_imagen);

        const base = (process.env.MINIO_PUBLIC_URL || '').replace(/\/$/, '');
        if (base && imagen.url_imagen.startsWith(base)) {
            const key = imagen.url_imagen.replace(base + '/', '');
            minioService.deleteFile(key).catch(e => console.error('No se pudo borrar de R2:', e.message));
        }

        res.json({ mensaje: 'Imagen eliminada' });
    } catch (err) {
        responder.error(res, 500, 'Error al eliminar imagen', err, 'Error eliminando imagen:');
    }
}

module.exports = { subir, listar, marcarPrincipal, eliminar };
