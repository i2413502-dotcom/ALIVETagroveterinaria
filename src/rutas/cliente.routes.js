const express = require('express');
const router = express.Router();
const clienteController = require('../controladores/cliente.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

// Lista de clientes: dato sensible, solo panel admin
router.get('/', verificarToken, verificarRol('COLABORADOR'), clienteController.obtenerClientes);

// Activar/desactivar (nunca hard delete: ver cliente.model.js)
router.put('/:idPersona/estado', verificarToken, verificarRol('COLABORADOR'), clienteController.cambiarEstado);

module.exports = router;
