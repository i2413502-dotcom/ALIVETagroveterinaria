const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/colaborador.controller');

router.get('/',                   ctrl.getAll);
router.get('/cargos',             ctrl.getCargos);
router.post('/',                  ctrl.create);
router.put('/:id',                ctrl.update);
router.put('/:id/reset-password', ctrl.resetPassword);

module.exports = router;