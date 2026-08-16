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

  // La mayoría de las peticiones (la app, el panel web con fetch)
  // mandan el token por header. Pero cuando el link se abre
  // directamente en un navegador (ej. "Abrir en Chrome" para
  // descargar un PDF desde la app móvil), el navegador NO puede
  // agregar el header Authorization — por eso también aceptamos
  // el token como "?token=" en la URL, solo como respaldo cuando
  // no viene el header.
  let token = null;
  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ mensaje: 'No autorizado: token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded = { id, rol, cargo, iat, exp }  (igual al payload de auth.controller.js -> login)
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

// ─────────────────────────────────────────────────────────────
//  verificarCargo — restringe por CARGO dentro de COLABORADOR
//  (Administrador/Gerente/Vendedor/Asistente de ventas), no solo
//  por rol. El cargo viene embebido en el token desde el login
//  (auth.controller.js), así que no hace falta ir a la base.
//
//  USADO PARA LA APP MÓVIL: la app oculta ciertas tarjetas del
//  dashboard según el cargo (dashboard_screen.dart: _esAdministrador
//  / _puedeGestionarInventario), pero ESTE middleware es el que
//  realmente protege — bloquea el pedido aunque alguien llame a la
//  API directamente sin pasar por la app o el botón oculto.
//
//  Uso (después de verificarToken):
//    router.delete('/:id', verificarToken, verificarCargo('Administrador'), ctrl.eliminar);
//
//  Si el token es de antes de este cambio (no tiene `cargo`),
//  lo trata como sin permiso — obliga a volver a iniciar sesión,
//  que es lo correcto para que el nuevo cargo quede registrado.
// ─────────────────────────────────────────────────────────────
const verificarCargo = (...cargosPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario || !cargosPermitidos.includes(req.usuario.cargo)) {
      return res.status(403).json({
        mensaje: 'Esta acción es exclusiva del Administrador. Si tu cargo cambió recientemente, vuelve a iniciar sesión.'
      });
    }
    next();
  };
};

module.exports = { verificarToken, verificarRol, verificarCargo };
