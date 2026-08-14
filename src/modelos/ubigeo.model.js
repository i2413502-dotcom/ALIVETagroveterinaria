const db = require('../config/db');

async function getDepartamentos() {
    const [rows] = await db.query('SELECT * FROM departamento ORDER BY nombre');
    return rows;
}

async function getProvincias(idDepartamento) {
    const [rows] = await db.query(
        'SELECT * FROM provincia WHERE id_departamento = ? ORDER BY nombre',
        [idDepartamento]
    );
    return rows;
}

async function getDistritos(idProvincia) {
    const [rows] = await db.query(
        'SELECT * FROM distrito WHERE id_provincia = ? ORDER BY nombre',
        [idProvincia]
    );
    return rows;
}

module.exports = { getDepartamentos, getProvincias, getDistritos };
