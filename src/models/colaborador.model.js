const db     = require('../config/db');
const bcrypt = require('bcrypt');

exports.getAll = async () => {
    const [rows] = await db.query(`
        SELECT col.id_colaborador, col.dni, col.usuario, col.estado,
               per.nombres, per.apellido_paterno, per.apellido_materno,
               per.correo, per.telefono, per.id_persona,
               car.nombre AS cargo, col.id_cargo
        FROM colaborador col
        JOIN persona per    ON col.id_persona = per.id_persona
        LEFT JOIN cargo car ON col.id_cargo   = car.id_cargo
        ORDER BY col.id_colaborador
    `);
    return rows;
};

exports.getCargos = async () => {
    const [rows] = await db.query("SELECT * FROM cargo WHERE estado='ACTIVO' ORDER BY nombre");
    return rows;
};

exports.create = async (data) => {
    const { nombres, apellido_paterno, apellido_materno,
            correo, telefono, password, dni, id_cargo, usuario } = data;

    const hash = await bcrypt.hash(password, 10);

    const [r1] = await db.query(
        `INSERT INTO persona (nombres, apellido_paterno, apellido_materno, correo, telefono, password, estado, fecha_creacion)
         VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO', NOW())`,
        [nombres, apellido_paterno || null, apellido_materno || null,
         correo, telefono || null, hash]
    );
    const idPersona = r1.insertId;

    const [r2] = await db.query(
        `INSERT INTO colaborador (id_persona, dni, id_cargo, usuario, estado) VALUES (?, ?, ?, ?, 'ACTIVO')`,
        [idPersona, dni, id_cargo, usuario]
    );
    return r2.insertId;
};

exports.update = async (id, data) => {
    const { nombres, apellido_paterno, apellido_materno,
            telefono, id_cargo, usuario, estado } = data;

    const [[col]] = await db.query(
        'SELECT id_persona FROM colaborador WHERE id_colaborador=?', [id]
    );
    if (!col) throw new Error('Colaborador no encontrado');

    await db.query(
        `UPDATE persona SET nombres=?, apellido_paterno=?, apellido_materno=?, telefono=?
         WHERE id_persona=?`,
        [nombres, apellido_paterno || null, apellido_materno || null,
         telefono || null, col.id_persona]
    );
    await db.query(
        'UPDATE colaborador SET id_cargo=?, usuario=?, estado=? WHERE id_colaborador=?',
        [id_cargo, usuario, estado, id]
    );
};

exports.resetPassword = async (id, nuevaPassword) => {
    const hash    = await bcrypt.hash(nuevaPassword, 10);
    const [[col]] = await db.query(
        'SELECT id_persona FROM colaborador WHERE id_colaborador=?', [id]
    );
    if (!col) throw new Error('Colaborador no encontrado');
    await db.query('UPDATE persona SET password=? WHERE id_persona=?', [hash, col.id_persona]);
};