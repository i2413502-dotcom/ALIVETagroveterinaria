const Producto      = require('../modelos/producto.model');
const imagenModel   = require('../modelos/imagen.model');
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
        // Ficha pública: si está inactivo o sin stock, no debe mostrarse
        // en la tienda (aunque el registro siga existiendo en la BD).
        if (producto.estado !== 'ACTIVO' || producto.stock_actual <= 0) {
            return res.status(404).json({ mensaje: 'Producto no disponible' });
        }
        res.json(producto);
    } catch (err) {
        console.error('Error en obtener producto por ID:', err);
        res.status(500).json({ mensaje: 'Error al obtener producto' });
    }
};

// Igual que obtenerPorId, pero para el panel admin: sin la restricción de
// estado/stock (el admin necesita poder editar productos inactivos o
// agotados). Se usa para precargar el modal de edición con sus imágenes
// secundarias y variantes.
exports.obtenerParaAdmin = async (req, res) => {
    try {
        const producto = await Producto.obtenerProductoPorId(req.params.id);
        if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });
        res.json(producto);
    } catch (err) {
        console.error('Error en obtener producto (admin):', err);
        res.status(500).json({ mensaje: 'Error al obtener producto' });
    }
};

exports.crear = async (req, res) => {
    try {
        const idProducto = await Producto.crearProducto(req.body);

        // Compatibilidad con el formulario actual de dashboard.html: ya
        // sube el archivo a /api/upload/imagen-producto y manda la URL
        // resultante como "imagen" en el body. La registramos como la
        // primera imagen del producto en imagen_producto (queda como principal).
        if (req.body.imagen) {
            await imagenModel.agregar(idProducto, req.body.imagen);
        }

        // Hasta 2 imágenes secundarias (ya subidas a R2 desde el frontend,
        // llegan como URLs). Se registran después de la principal, así
        // que imagenModel.agregar() las marca automáticamente como no-principales.
        const secundarias = Array.isArray(req.body.imagenes_secundarias)
            ? req.body.imagenes_secundarias.filter(Boolean).slice(0, 2)
            : [];
        for (const url of secundarias) {
            await imagenModel.agregar(idProducto, url);
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

        // Hasta 2 imágenes secundarias — no duplica si la URL ya estaba
        // registrada para este producto (agregarSiNoExiste).
        const secundarias = Array.isArray(req.body.imagenes_secundarias)
            ? req.body.imagenes_secundarias.filter(Boolean).slice(0, 2)
            : [];
        for (const url of secundarias) {
            await imagenModel.agregarSiNoExiste(req.params.id, url);
        }

        res.json({ mensaje: 'Producto actualizado' });
    } catch (err) {
        console.error('Error en actualizar producto:', err);
        res.status(500).json({ mensaje: 'Error al actualizar producto' });
    }
};

// Borrado físico: elimina el producto y, en cascada, sus imágenes (BD + R2)
// y variantes.
//
// Regla de negocio (requerimiento del panel admin):
//  - Si el producto NO está asociado a ningún pedido → se elimina sin problema.
//  - Si está asociado a pedido(s) y TODOS ya fueron ENTREGADOS → se elimina
//    de forma definitiva igualmente (el pedido/comprobante conserva su total,
//    solo se pierde el detalle línea por línea de este producto puntual).
//  - Si tiene algún pedido en un estado que NO es ENTREGADO (PENDIENTE,
//    PAGADO, ENVIADO, CANCELADO) → se bloquea y se sugiere "Desactivar".
exports.eliminar = async (req, res) => {
    try {
        const { id } = req.params;
        const producto = await Producto.obtenerProductoPorId(id);
        if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });

        const estados = await Producto.obtenerEstadosPedidosAsociados(id);
        const noEntregados = estados.filter(e => e !== 'ENTREGADO');
        if (noEntregados.length > 0) {
            return res.status(409).json({
                mensaje: `No se puede eliminar: el producto está asociado a pedido(s) en estado ${noEntregados.join(', ')}. Usa "Desactivar" para ocultarlo del catálogo, o espera a que esos pedidos sean entregados.`
            });
        }

        // Borrar los archivos de imagen en R2 (no bloqueante si falla la nube;
        // el registro en BD igual se elimina dentro de la transacción de abajo)
        const base = (process.env.MINIO_PUBLIC_URL || '').replace(/\/$/, '');
        for (const img of producto.imagenes) {
            if (base && img.url_imagen.startsWith(base)) {
                const key = img.url_imagen.replace(base + '/', '');
                minioService.deleteFile(key).catch(e => console.error('No se pudo borrar de R2:', e.message));
            }
        }

        // Borrado físico en cascada (detalle_pedido ya entregado, variantes,
        // imágenes y el producto), todo en una sola transacción.
        await Producto.eliminarProductoFisico(id);

        res.json({ mensaje: 'Producto eliminado permanentemente' });
    } catch (err) {
        // Por si queda alguna FK no contemplada arriba
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
            return res.status(409).json({
                mensaje: 'No se puede eliminar: el producto está asociado a otros registros. Usa "Desactivar" para ocultarlo del catálogo.'
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
