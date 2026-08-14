const ubigeoModel = require('../modelos/ubigeo.model');

async function getDepartamentos(req, res) {
    try {
        const rows = await ubigeoModel.getDepartamentos();
        res.json(rows);
    } catch (err) {
        res.status(500).json({ mensaje: 'Error al obtener departamentos' });
    }
}

async function getProvincias(req, res) {
    try {
        const rows = await ubigeoModel.getProvincias(req.params.idDepartamento);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ mensaje: 'Error al obtener provincias' });
    }
}

async function getDistritos(req, res) {
    try {
        const rows = await ubigeoModel.getDistritos(req.params.idProvincia);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ mensaje: 'Error al obtener distritos' });
    }
}

module.exports = { getDepartamentos, getProvincias, getDistritos };
