const express = require('express');
const router = express.Router();
const upload = require('../config/upload');
const { verificarToken, verificarRol, verificarCargo } = require('../middlewares/auth.middleware');

// Cada bloque de endpoints vive en su propio controlador (ver src/controladores/):
//   auth.controller.js       -> login, registro, verificación OTP
//   password.controller.js   -> recuperación/cambio de contraseña
//   perfil.controller.js     -> perfil, dirección, FCM
//   documento.controller.js  -> consulta DNI/RUC (Reniec/Sunat)
//   promocion.controller.js  -> envío de correos promocionales
// Todas las URLs se mantienen exactamente iguales a como estaban.
const authController      = require('../controladores/auth.controller');
const passwordController  = require('../controladores/password.controller');
const perfilController    = require('../controladores/perfil.controller');
const documentoController = require('../controladores/documento.controller');
const promocionController = require('../controladores/promocion.controller');

// Públicas — no requieren sesión iniciada
router.post('/login',              authController.login);
// Se utiliza para el móvil
router.post('/login-verificar-otp', authController.loginVerificarOtp);
router.post('/registro',           authController.register);
router.post('/verify-otp',          authController.verifyOtp);
router.get('/consultar-documento', documentoController.consultarDocumento);
router.get('/validar-correo',      authController.validarCorreo);
router.post('/forgot-password',     passwordController.forgotPassword);
router.post('/reset-password',      passwordController.resetPassword);
router.post('/forgot-password-otp', passwordController.forgotPasswordOtp);
router.post('/reset-password-otp',  passwordController.resetPasswordOtp);

// Requieren estar logueado (cualquier rol: CLIENTE o COLABORADOR)
router.get('/perfil',             verificarToken, perfilController.getPerfil);
router.get('/datos-envio',        verificarToken, perfilController.getDatosEnvio);
router.put('/actualizar-perfil',  verificarToken, perfilController.actualizarPerfil);
router.put('/cambiar-password',   verificarToken, passwordController.cambiarPassword);
// Se utiliza para el móvil
router.put('/cambiar-password-verificar-otp', verificarToken, passwordController.cambiarPasswordVerificarOtp);
router.post('/fcm-token',         verificarToken, perfilController.guardarFcmToken);
router.put('/guardar-direccion',  verificarToken, perfilController.guardarDireccionHabitual);

// Se utiliza para el móvil
router.post('/enviar-promocion',
    verificarToken, verificarRol('COLABORADOR'), verificarCargo('Administrador'),
    upload.single('imagen'),
    promocionController.enviarPromocion
);

module.exports = router;
