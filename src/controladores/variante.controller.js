const varianteModel = require('../modelos/variante.model');
const productoModel  = require('../modelos/producto.model');
const responder = require('../utils/responder');

// GET /api/variantes/catalogos — colores/tallas/etapas/presentaciones (público)
async function catalogos(req, res) {
    try {
        const data = await varianteModel.obtenerCatalogos();
        res.json(data);
    } catch (err) {
        responder.error(res, 500, 'Error al obtener catálogos', err, 'Error obteniendo catálogos de variantes:');
    }
}

// GET /api/variantes/producto/:idProducto — variantes de un producto (público)
async function listarPorProducto(req, res) {
    try {
        const variantes = await varianteModel.listarPorProducto(req.params.idProducto);
        res.json(variantes);
    } catch (err) {
        responder.error(res, 500, 'Error al obtener variantes', err, 'Error obteniendo variantes:');
    }
}

// POST /api/variantes/producto/:idProducto — crear variante (colaborador)
async function crear(req, res) {
    try {
        const { idProducto } = req.params;
        const producto = await productoModel.obtenerProductoPorId(idProducto);
        if (!producto) return res.status(404).json({ mensaje: 'Producto no encontrado' });

        if (!req.body.precio_venta) {
            return res.status(400).json({ mensaje: 'precio_venta es requerido' });
        }

        const idVariante = await varianteModel.crear(idProducto, req.body);
        res.status(201).json({ id_variante: idVariante, mensaje: 'Variante creada correctamente' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ mensaje: 'Ya existe una variante con ese SKU' });
        }
        console.error('Error creando variante:', err);
        res.status(500).json({ mensaje: 'Error al crear variante' });
    }
}

// PUT /api/variantes/:id — actualizar stock/precio/combinación (colaborador)
async function actualizar(req, res) {
    try {
        const variante = await varianteModel.obtenerPorId(req.params.id);
        if (!variante) return res.status(404).json({ mensaje: 'Variante no encontrada' });

        await varianteModel.actualizar(req.params.id, req.body);
        res.json({ mensaje: 'Variante actualizada correctamente' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ mensaje: 'Ya existe una variante con ese SKU' });
        }
        console.error('Error actualizando variante:', err);
        res.status(500).json({ mensaje: 'Error al actualizar variante' });
    }
}

// DELETE /api/variantes/:id — eliminar variante (colaborador)
async function eliminar(req, res) {
    try {
        const variante = await varianteModel.obtenerPorId(req.params.id);
        if (!variante) return res.status(404).json({ mensaje: 'Variante no encontrada' });

        await varianteModel.eliminar(req.params.id);
        res.json({ mensaje: 'Variante eliminada correctamente' });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
            return res.status(409).json({
                mensaje: 'No se puede eliminar: la variante está asociada a pedidos existentes'
            });
        }
        console.error('Error eliminando variante:', err);
        res.status(500).json({ mensaje: 'Error al eliminar variante' });
    }
}

module.exports = { catalogos, listarPorProducto, crear, actualizar, eliminar };
