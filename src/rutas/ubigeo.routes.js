const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/ubigeo.controller');

// Se utiliza para el móvil
router.get('/departamentos',              ctrl.getDepartamentos);
// Se utiliza para el móvil
router.get('/provincias/:idDepartamento', ctrl.getProvincias);
// Se utiliza para el móvil
router.get('/distritos/:idProvincia',     ctrl.getDistritos);

module.exports = router;
