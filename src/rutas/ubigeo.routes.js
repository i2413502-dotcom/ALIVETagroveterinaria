const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/ubigeo.controller');

router.get('/departamentos',              ctrl.getDepartamentos);
router.get('/provincias/:idDepartamento', ctrl.getProvincias);
router.get('/distritos/:idProvincia',     ctrl.getDistritos);

module.exports = router;
