const express = require('express');
const router = express.Router();
const clienteController = require('../controladores/cliente.controller');
const { verificarToken, verificarRol, verificarCargo } = require('../middlewares/auth.middleware');

// Se utiliza para el móvil
router.get('/', verificarToken, verificarRol('COLABORADOR'), clienteController.obtenerClientes);
// Se utiliza para el móvil
router.delete('/:idPersona',
    verificarToken, verificarRol('COLABORADOR'), verificarCargo('Administrador', 'Gerente'),
    clienteController.eliminar
);

module.exports = router;
