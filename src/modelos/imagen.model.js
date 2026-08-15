const db = require('../config/db');

// Todas las imágenes de un producto, principal primero
async function listarPorProducto(idProducto) {
    const [rows] = await db.query(
        `SELECT id_imagen, id_producto, url_imagen, es_principal, orden
         FROM imagen_producto
         WHERE id_producto = ?
         ORDER BY es_principal DESC, orden ASC, id_imagen ASC`,
        [idProducto]
    );
    return rows;
}

// Agrega una imagen nueva. La primera imagen de un producto se marca
// automáticamente como principal.
async function agregar(idProducto, urlImagen) {
    const [[{ total }]] = await db.query(
        'SELECT COUNT(*) AS total FROM imagen_producto WHERE id_producto = ?',
        [idProducto]
    );
    const esPrincipal = total === 0 ? 1 : 0;

    const [result] = await db.query(
        `INSERT INTO imagen_producto (id_producto, url_imagen, es_principal, orden)
         VALUES (?, ?, ?, ?)`,
        [idProducto, urlImagen, esPrincipal, total]
    );
    return result.insertId;
}

// Igual que agregar(), pero no duplica si esa URL ya está registrada
// para el producto. Se usa para mantener compatible el formulario viejo
// de dashboard.html, que reenvía la misma URL de imagen en cada edición.
async function agregarSiNoExiste(idProducto, urlImagen) {
    const [rows] = await db.query(
        'SELECT id_imagen FROM imagen_producto WHERE id_producto = ? AND url_imagen = ?',
        [idProducto, urlImagen]
    );
    if (rows.length > 0) return rows[0].id_imagen;
    return agregar(idProducto, urlImagen);
}

async function obtenerPorId(idImagen) {
    const [rows] = await db.query('SELECT * FROM imagen_producto WHERE id_imagen = ?', [idImagen]);
    return rows[0];
}

async function eliminar(idImagen) {
    await db.query('DELETE FROM imagen_producto WHERE id_imagen = ?', [idImagen]);
}

// Marca una imagen como principal y desmarca las demás del mismo producto
async function marcarPrincipal(idImagen, idProducto) {
    await db.query('UPDATE imagen_producto SET es_principal = 0 WHERE id_producto = ?', [idProducto]);
    await db.query('UPDATE imagen_producto SET es_principal = 1 WHERE id_imagen = ?', [idImagen]);
}

module.exports = { listarPorProducto, agregar, agregarSiNoExiste, obtenerPorId, eliminar, marcarPrincipal };
