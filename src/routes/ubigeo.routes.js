const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/departamentos', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM departamento ORDER BY nombre');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ mensaje: 'Error al obtener departamentos' });
    }
});

router.get('/provincias/:idDepartamento', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM provincia WHERE id_departamento = ? ORDER BY nombre',
            [req.params.idDepartamento]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ mensaje: 'Error al obtener provincias' });
    }
});

router.get('/distritos/:idProvincia', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM distrito WHERE id_provincia = ? ORDER BY nombre',
            [req.params.idProvincia]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ mensaje: 'Error al obtener distritos' });
    }
});

module.exports = router;