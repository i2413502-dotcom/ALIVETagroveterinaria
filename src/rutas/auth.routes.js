const express = require('express');
const router = express.Router();
const upload = require('../config/upload');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

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
router.post('/registro',           authController.register);
router.post('/verify-otp',          authController.verifyOtp);
router.get('/consultar-documento', documentoController.consultarDocumento);
router.post('/forgot-password',     passwordController.forgotPassword);
router.post('/reset-password',      passwordController.resetPassword);
router.post('/forgot-password-otp', passwordController.forgotPasswordOtp);
router.post('/reset-password-otp',  passwordController.resetPasswordOtp);

// Requieren estar logueado (cualquier rol: CLIENTE o COLABORADOR)
router.get('/perfil',             verificarToken, perfilController.getPerfil);
router.get('/datos-envio',        verificarToken, perfilController.getDatosEnvio);
router.put('/actualizar-perfil',  verificarToken, perfilController.actualizarPerfil);
router.put('/cambiar-password',   verificarToken, passwordController.cambiarPassword);
router.post('/fcm-token',         verificarToken, perfilController.guardarFcmToken);
router.put('/guardar-direccion',  verificarToken, perfilController.guardarDireccionHabitual);

// Antes sin protección alguna — ahora exclusivo de colaboradores
router.post('/enviar-promocion',
    verificarToken, verificarRol('COLABORADOR'),
    upload.single('imagen'),
    promocionController.enviarPromocion
);

module.exports = router;
