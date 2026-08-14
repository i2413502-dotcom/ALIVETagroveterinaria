const Producto      = require('../modelos/producto.model');
const imagenModel   = require('../modelos/imagen.model');
const varianteModel = require('../modelos/variante.model');
const minioService  = require('../servicios/minio.service');

exports.listar = async (req, res) => {
    try {
        const resultado = await Producto.obtenerProductos(req.query);
        if (req.query.pagina) {
            res.json(resultado);
        } else {
            res.json(resultado.productos);
        }
    } catch (err) {
        console.error('Error en listar productos:', err);
        res.status(500).json({ mensaje: 'Error al obtener productos' });
    }
};

// Devuelve el producto con sus imágenes y variantes ya anidadas
// (ver Producto.obtenerProductoPorId en el modelo)
exports.obtenerPorId = async (req, res) => {
    try {
        const producto = await Producto.obtenerProductoPorId(req.params.id);
        if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });
        res.json(producto);
    } catch (err) {
        console.error('Error en obtener producto por ID:', err);
        res.status(500).json({ mensaje: 'Error al obtener producto' });
    }
};

exports.crear = async (req, res) => {
    try {
        const idProducto = await Producto.crearProducto(req.body);

        // Compatibilidad con el formulario actual de dashboard.html: ya
        // sube el archivo a /api/upload/imagen-producto y manda la URL
        // resultante como "imagen" en el body. La registramos como la
        // primera imagen del producto en imagen_producto.
        if (req.body.imagen) {
            await imagenModel.agregar(idProducto, req.body.imagen);
        }

        res.status(201).json({ id_producto: idProducto, mensaje: 'Producto creado correctamente' });
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ mensaje: 'Error al crear producto' });
    }
};

exports.actualizar = async (req, res) => {
    try {
        const producto = await Producto.obtenerProductoPorId(req.params.id);
        if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });

        await Producto.actualizarProducto(req.params.id, req.body);

        // Igual que en crear(): si el formulario viejo manda una URL de
        // imagen, se registra en imagen_producto (sin duplicar si ya existe).
        if (req.body.imagen) {
            await imagenModel.agregarSiNoExiste(req.params.id, req.body.imagen);
        }

        res.json({ mensaje: 'Producto actualizado' });
    } catch (err) {
        console.error('Error en actualizar producto:', err);
        res.status(500).json({ mensaje: 'Error al actualizar producto' });
    }
};

// Borrado físico: elimina el producto y, en cascada, sus imágenes (BD + R2)
// y variantes. Bloqueado si el producto ya fue vendido (FK con pedidos).
exports.eliminar = async (req, res) => {
    try {
        const producto = await Producto.obtenerProductoPorId(req.params.id);
        if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });

        // Limpiar imágenes (BD + intento de borrado en R2, no bloqueante)
        const base = (process.env.MINIO_PUBLIC_URL || '').replace(/\/$/, '');
        for (const img of producto.imagenes) {
            if (base && img.url_imagen.startsWith(base)) {
                const key = img.url_imagen.replace(base + '/', '');
                minioService.deleteFile(key).catch(e => console.error('No se pudo borrar de R2:', e.message));
            }
        }
        await Promise.all(producto.imagenes.map(img => imagenModel.eliminar(img.id_imagen)));

        // Limpiar variantes
        await Promise.all(producto.variantes.map(v => varianteModel.eliminar(v.id_variante)));

        await Producto.eliminarProductoFisico(req.params.id);

        res.json({ mensaje: 'Producto eliminado permanentemente' });
    } catch (err) {
        // FK: el producto está asociado a pedidos/carritos → no se puede borrar
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
            return res.status(409).json({
                mensaje: 'No se puede eliminar: el producto está asociado a pedidos u otros registros. Usa "Desactivar" para ocultarlo del catálogo.'
            });
        }
        console.error('Error en eliminar producto:', err);
        res.status(500).json({ mensaje: 'Error al eliminar producto' });
    }
};

// Cambiar estado lógico: ACTIVO / INACTIVO (activar/desactivar)
exports.cambiarEstado = async (req, res) => {
    try {
        const { estado } = req.body;
        if (!['ACTIVO', 'INACTIVO'].includes(estado)) {
            return res.status(400).json({ mensaje: 'Estado inválido' });
        }
        await Producto.cambiarEstadoProducto(req.params.id, estado);
        res.json({ mensaje: `Producto ${estado === 'ACTIVO' ? 'activado' : 'desactivado'}` });
    } catch (err) {
        console.error('Error al cambiar estado:', err);
        res.status(500).json({ mensaje: 'Error al cambiar estado del producto' });
    }
};

exports.buscarFichaTecnica = async (req, res) => {
    try {
        const { nombre } = req.query;
        if (!nombre) return res.status(400).json({ mensaje: 'Nombre requerido' });

        const url = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(nombre)}`;
        const response = await fetch(url);

        if (!response.ok) {
            return res.json({ encontrado: false, mensaje: 'No se encontró información' });
        }

        const data = await response.json();
        res.json({
            encontrado: true,
            resumen:    data.extract || '',
            url:        data.content_urls?.desktop?.page || ''
        });
    } catch (err) {
        console.error('Error buscando ficha técnica:', err);
        res.json({ encontrado: false, mensaje: 'Error al buscar' });
    }
};