const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/animal.controller');

router.get('/',       ctrl.getAll);  // GET    /api/animales
router.post('/',      ctrl.create);  // POST   /api/animales
router.put('/:id',    ctrl.update);  // PUT    /api/animales/1
router.delete('/:id', ctrl.delete);  // DELETE /api/animales/1

module.exports = router;