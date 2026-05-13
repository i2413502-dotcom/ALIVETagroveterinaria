const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/categoria.controller');

router.get('/',       ctrl.getAll);  // GET    /api/categorias
router.post('/',      ctrl.create);  // POST   /api/categorias
router.put('/:id',    ctrl.update);  // PUT    /api/categorias/1
router.delete('/:id', ctrl.delete);  // DELETE /api/categorias/1

module.exports = router;