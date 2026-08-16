const express = require('express');
const router  = express.Router();
const ctrl    = require('../controladores/config.controller');

router.get('/', ctrl.publico);

module.exports = router;
