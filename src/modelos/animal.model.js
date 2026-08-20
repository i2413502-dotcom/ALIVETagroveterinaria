const db = require('../config/db');

// Obtener todos los tipos de animal
exports.getAll = async () => {
    const [rows] = await db.query('SELECT * FROM tipo_animal ORDER BY id_tipo_animal');
    return rows;
};

// Crear nuevo tipo de animal
exports.create = async ({ nombre, grupo, estado }) => {
    const [result] = await db.query(
        'INSERT INTO tipo_animal (nombre, grupo, estado) VALUES (?, ?, ?)',
        [nombre, grupo || 'MENOR', estado || 'ACTIVO']
    );
    return result.insertId;
};

// Actualizar tipo de animal
exports.update = async (id, { nombre, grupo, estado }) => {
    await db.query(
        'UPDATE tipo_animal SET nombre=?, grupo=?, estado=? WHERE id_tipo_animal=?',
        [nombre, grupo || 'MENOR', estado, id]
    );
};

// Eliminar (solo si no tiene productos activos)
exports.delete = async (id) => {
    const [[check]] = await db.query(
        'SELECT COUNT(*) total FROM producto WHERE id_tipo_animal=? AND estado="ACTIVO"',
        [id]
    );
    if (check.total > 0) throw new Error('No se puede eliminar: tiene productos activos asociados');
    await db.query('DELETE FROM tipo_animal WHERE id_tipo_animal=?', [id]);
};