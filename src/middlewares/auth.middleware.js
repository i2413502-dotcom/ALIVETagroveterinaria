const jwt = require('jsonwebtoken');

// ─────────────────────────────────────────────────────────────
//  verificarToken — middleware de autenticación.
//
//  Revisa el header "Authorization: Bearer <token>", valida el
//  JWT, y si es correcto, deja la info del usuario disponible
//  en req.usuario (igual a lo que ya hacía guardarFcmToken
//  manualmente: { id, rol }).
//
//  Uso en una ruta:
//    const { verificarToken } = require('../middlewares/auth.middleware');
//    router.post('/', verificarToken, ctrl.crear);
//
//  Si el token falta, es inválido o expiró, responde 401 y la
//  petición NUNCA llega al controller.
// ─────────────────────────────────────────────────────────────
const verificarToken = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'No autorizado: token no proporcionado' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded = { id, rol, iat, exp }  (igual al payload de auth.controller.js -> login)
    req.usuario = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ mensaje: 'Sesión expirada, vuelve a iniciar sesión' });
    }
    return res.status(401).json({ mensaje: 'Token inválido' });
  }
};

// ─────────────────────────────────────────────────────────────
//  verificarRol — middleware adicional, opcional.
//  Se usa DESPUÉS de verificarToken, cuando una ruta debe
//  permitirse solo a ciertos roles.
//
//  Uso:
//    router.post('/', verificarToken, verificarRol('COLABORADOR'), ctrl.crear);
// ─────────────────────────────────────────────────────────────
const verificarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ mensaje: 'No tienes permiso para esta acción' });
    }
    next();
  };
};

module.exports = { verificarToken, verificarRol };
