const db = require('../config/db');

// Catálogos para construir el formulario de variantes (selects de color,
// talla, etapa de edad y presentación de medicamento)
async function obtenerCatalogos() {
    const [colores]        = await db.query('SELECT id_color AS id, nombre, codigo_hex FROM color WHERE estado = "ACTIVO" ORDER BY nombre');
    const [tallas]         = await db.query('SELECT id_talla AS id, nombre FROM talla WHERE estado = "ACTIVO" ORDER BY orden');
    const [etapas]         = await db.query('SELECT id_etapa_edad AS id, nombre FROM etapa_edad_animal WHERE estado = "ACTIVO" ORDER BY id_etapa_edad');
    const [presentaciones] = await db.query('SELECT id_presentacion AS id, nombre, unidad_medida FROM presentacion_medicamento WHERE estado = "ACTIVO" ORDER BY nombre');
    return { colores, tallas, etapas, presentaciones };
}

async function listarPorProducto(idProducto) {
    const [rows] = await db.query(
        `SELECT v.id_variante, v.id_producto, v.sku, v.precio_venta, v.stock_actual,
                v.stock_minimo, v.estado,
                v.id_color, co.nombre AS color, co.codigo_hex,
                v.id_talla, tal.nombre AS talla,
                v.id_etapa_edad, ee.nombre AS etapa_edad,
                v.id_presentacion, pr.nombre AS presentacion, pr.unidad_medida
         FROM variante_producto v
         LEFT JOIN color co                    ON co.id_color = v.id_color
         LEFT JOIN talla tal                   ON tal.id_talla = v.id_talla
         LEFT JOIN etapa_edad_animal ee         ON ee.id_etapa_edad = v.id_etapa_edad
         LEFT JOIN presentacion_medicamento pr  ON pr.id_presentacion = v.id_presentacion
         WHERE v.id_producto = ?
         ORDER BY v.id_variante`,
        [idProducto]
    );
    return rows;
}

async function obtenerPorId(idVariante) {
    const [rows] = await db.query('SELECT * FROM variante_producto WHERE id_variante = ?', [idVariante]);
    return rows[0];
}

async function crear(idProducto, data) {
    const { id_color, id_talla, id_etapa_edad, id_presentacion, sku, precio_venta, stock_actual, stock_minimo } = data;
    const [result] = await db.query(
        `INSERT INTO variante_producto
            (id_producto, id_color, id_talla, id_etapa_edad, id_presentacion, sku, precio_venta, stock_actual, stock_minimo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            idProducto,
            id_color        || null,
            id_talla        || null,
            id_etapa_edad   || null,
            id_presentacion || null,
            sku             || null,
            precio_venta,
            stock_actual    || 0,
            stock_minimo    || 0
        ]
    );
    return result.insertId;
}

async function actualizar(idVariante, data) {
    const { id_color, id_talla, id_etapa_edad, id_presentacion, sku, precio_venta, stock_actual, stock_minimo, estado } = data;
    await db.query(
        `UPDATE variante_producto SET
            id_color = ?, id_talla = ?, id_etapa_edad = ?, id_presentacion = ?,
            sku = ?, precio_venta = ?, stock_actual = ?, stock_minimo = ?, estado = ?
         WHERE id_variante = ?`,
        [
            id_color        || null,
            id_talla        || null,
            id_etapa_edad   || null,
            id_presentacion || null,
            sku             || null,
            precio_venta,
            stock_actual,
            stock_minimo    || 0,
            estado          || 'ACTIVO',
            idVariante
        ]
    );
}

async function eliminar(idVariante) {
    await db.query('DELETE FROM variante_producto WHERE id_variante = ?', [idVariante]);
}

module.exports = { obtenerCatalogos, listarPorProducto, obtenerPorId, crear, actualizar, eliminar };
