const db = require('../config/db');

exports.bajoPorStock = async (req, res) => {
    try {
        const { id_tipo_animal } = req.query;
        let sql = `
            SELECT p.id_producto, p.nombre, p.imagen, p.precio_venta,
                   p.stock_actual, p.stock_minimo, p.codigo_barra,
                   c.nombre AS categoria, ta.nombre AS tipo_animal
            FROM producto p
            LEFT JOIN categoria_producto c ON p.id_categoria = c.id_categoria
            LEFT JOIN tipo_animal ta ON p.id_tipo_animal = ta.id_tipo_animal
            WHERE p.stock_actual <= p.stock_minimo AND p.estado = 'ACTIVO'
        `;
        const params = [];
        if (id_tipo_animal) {
            sql += ' AND p.id_tipo_animal = ?';
            params.push(id_tipo_animal);
        }
        sql += ' ORDER BY p.stock_actual ASC';
        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener productos con bajo stock' });
    }
};

exports.porVencer = async (req, res) => {
    try {
        const { id_tipo_animal } = req.query;
        const dias = req.query.dias || 30;
        let sql = `
            SELECT p.id_producto, p.nombre, p.imagen, p.precio_venta,
                   p.stock_actual, p.fecha_vencimiento, p.codigo_barra,
                   DATEDIFF(p.fecha_vencimiento, NOW()) AS dias_restantes,
                   c.nombre AS categoria, ta.nombre AS tipo_animal
            FROM producto p
            LEFT JOIN categoria_producto c ON p.id_categoria = c.id_categoria
            LEFT JOIN tipo_animal ta ON p.id_tipo_animal = ta.id_tipo_animal
            WHERE p.fecha_vencimiento IS NOT NULL
              AND p.fecha_vencimiento >= NOW()
              AND p.fecha_vencimiento <= DATE_ADD(NOW(), INTERVAL ? DAY)
              AND p.estado = 'ACTIVO'
        `;
        const params = [dias];
        if (id_tipo_animal) {
            sql += ' AND p.id_tipo_animal = ?';
            params.push(id_tipo_animal);
        }
        sql += ' ORDER BY p.fecha_vencimiento ASC';
        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener productos próximos a vencer' });
    }
};

exports.buscarPorCodigo = async (req, res) => {
    try {
        const { codigo } = req.params;
        const [rows] = await db.query(
            `SELECT p.*, c.nombre AS categoria, ta.nombre AS tipo_animal
             FROM producto p
             LEFT JOIN categoria_producto c ON p.id_categoria = c.id_categoria
             LEFT JOIN tipo_animal ta ON p.id_tipo_animal = ta.id_tipo_animal
             WHERE p.codigo_barra = ? AND p.estado = 'ACTIVO'`,
            [codigo]
        );
        if (!rows.length) return res.status(404).json({ mensaje: 'Producto no encontrado' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al buscar producto' });
    }
};

exports.actualizarStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { cantidad, fecha_vencimiento } = req.body;
        await db.query(
            `UPDATE producto 
             SET stock_actual = stock_actual + ?,
                 fecha_vencimiento = COALESCE(?, fecha_vencimiento)
             WHERE id_producto = ?`,
            [cantidad, fecha_vencimiento || null, id]
        );
        res.json({ mensaje: 'Stock actualizado correctamente' });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al actualizar stock' });
    }
};