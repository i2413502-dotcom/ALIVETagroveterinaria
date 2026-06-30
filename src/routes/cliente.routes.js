const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/cliente.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Lista de clientes: dato sensible, solo panel admin
router.get('/', verificarToken, verificarRol('COLABORADOR'), clienteController.obtenerClientes);

module.exports = router;
