const db = require('../config/db');

exports.obtenerProductosPorIds = async (ids) => {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await db.query(
        `SELECT p.id_producto, p.nombre, p.precio_venta, p.imagen, p.stock_actual
         FROM producto p
         WHERE p.id_producto IN (${placeholders}) AND p.estado = 'ACTIVO'`,
        ids
    );
    return rows;
};