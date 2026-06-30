const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/categoria.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

router.get('/',       ctrl.getAll);  // público (catálogo)

router.post('/',      verificarToken, verificarRol('COLABORADOR'), ctrl.create);
router.put('/:id',    verificarToken, verificarRol('COLABORADOR'), ctrl.update);
router.delete('/:id', verificarToken, verificarRol('COLABORADOR'), ctrl.delete);

module.exports = router;
