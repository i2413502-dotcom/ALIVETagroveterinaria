const db = require('../config/db');

const findByEmail = async (correo) => {
    const [rows] = await db.query(
        'SELECT * FROM persona WHERE correo = ?', [correo]
    );
    return rows[0];
};

const findCliente = async (idPersona) => {
    const [rows] = await db.query(
        'SELECT * FROM cliente WHERE id_persona = ?', [idPersona]
    );
    return rows[0];
};

const findColaborador = async (idPersona) => {
    const [rows] = await db.query(
        'SELECT * FROM colaborador WHERE id_persona = ?', [idPersona]
    );
    return rows[0];
};

const createPersona = async ({ nombres, apellidoPaterno, apellidoMaterno, correo, password }) => {
    const [result] = await db.query(
        `INSERT INTO persona 
         (nombres, apellido_paterno, apellido_materno, correo, password, estado, fecha_creacion) 
         VALUES (?, ?, ?, ?, ?, 'ACTIVO', NOW())`,
        [nombres, apellidoPaterno, apellidoMaterno, correo, password]
    );
    return result.insertId;
};

const createCliente = async (idPersona, idTipoDocumento, numeroDocumento) => {
    await db.query(
        'INSERT INTO cliente (id_persona, id_tipo_documento, numero_documento) VALUES (?, ?, ?)',
        [idPersona, idTipoDocumento, numeroDocumento]
    );
};

const findPersonaById = async (id) => {
    const [rows] = await db.query(
        `SELECT p.*, c.numero_documento, c.id_tipo_documento, td.nombre AS tipo_documento
         FROM persona p
         LEFT JOIN cliente c ON p.id_persona = c.id_persona
         LEFT JOIN tipo_documento td ON c.id_tipo_documento = td.id_tipo_documento
         WHERE p.id_persona = ?`,
        [id]
    );
    return rows[0];
};

module.exports = {
    findByEmail,
    findCliente,
    findColaborador,
    createPersona,
    createCliente,
    findPersonaById
};