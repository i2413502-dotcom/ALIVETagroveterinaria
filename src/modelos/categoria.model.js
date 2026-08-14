const db = require('../config/db');

// Obtener todas las categorías
exports.getAll = async () => {
    const [rows] = await db.query('SELECT * FROM categoria_producto ORDER BY id_categoria');
    return rows;
};

// Crear nueva categoría
exports.create = async ({ nombre, descripcion, estado }) => {
    const [result] = await db.query(
        'INSERT INTO categoria_producto (nombre, descripcion, estado) VALUES (?, ?, ?)',
        [nombre, descripcion || null, estado || 'ACTIVO']
    );
    return result.insertId;
};

// Actualizar categoría
exports.update = async (id, { nombre, descripcion, estado }) => {
    await db.query(
        'UPDATE categoria_producto SET nombre=?, descripcion=?, estado=? WHERE id_categoria=?',
        [nombre, descripcion || null, estado, id]
    );
};

// Eliminar categoría (solo si no tiene productos activos)
exports.delete = async (id) => {
    const [[check]] = await db.query(
        'SELECT COUNT(*) total FROM producto WHERE id_categoria=? AND estado="ACTIVO"',
        [id]
    );
    if (check.total > 0) throw new Error('No se puede eliminar: tiene productos activos');
    await db.query('DELETE FROM categoria_producto WHERE id_categoria=?', [id]);
};

// ── Subcategorías (Antibióticos, Crecimiento, Collares, etc.) ──────

// Subcategorías activas de una categoría (para el segundo <select> del formulario)
exports.getSubcategorias = async (idCategoria) => {
    const [rows] = await db.query(
        'SELECT * FROM subcategoria_producto WHERE id_categoria = ? AND estado = "ACTIVO" ORDER BY nombre',
        [idCategoria]
    );
    return rows;
};

exports.createSubcategoria = async ({ id_categoria, nombre, descripcion }) => {
    const [result] = await db.query(
        'INSERT INTO subcategoria_producto (id_categoria, nombre, descripcion) VALUES (?, ?, ?)',
        [id_categoria, nombre, descripcion || null]
    );
    return result.insertId;
};

exports.updateSubcategoria = async (id, { nombre, descripcion, estado }) => {
    await db.query(
        'UPDATE subcategoria_producto SET nombre=?, descripcion=?, estado=? WHERE id_subcategoria=?',
        [nombre, descripcion || null, estado || 'ACTIVO', id]
    );
};

// Eliminar subcategoría (solo si no tiene productos activos)
exports.deleteSubcategoria = async (id) => {
    const [[check]] = await db.query(
        'SELECT COUNT(*) total FROM producto WHERE id_subcategoria=? AND estado="ACTIVO"',
        [id]
    );
    if (check.total > 0) throw new Error('No se puede eliminar: tiene productos activos');
    await db.query('DELETE FROM subcategoria_producto WHERE id_subcategoria=?', [id]);
};