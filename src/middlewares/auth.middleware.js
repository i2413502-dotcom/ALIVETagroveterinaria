const jwt = require('jsonwebtoken');

// Se utiliza para el móvil
const verificarToken = (req, res, next) => {
  const header = req.headers.authorization;

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
    req.usuario = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ mensaje: 'Sesión expirada, vuelve a iniciar sesión' });
    }
    return res.status(401).json({ mensaje: 'Token inválido' });
  }
};

const verificarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ mensaje: 'No tienes permiso para esta acción' });
    }
    next();
  };
};

// Se utiliza para el móvil
const verificarCargo = (...cargosPermitidos) => {
  const normalizar = (s) => (s || '').toString().trim().toLowerCase();
  const permitidosNormalizados = cargosPermitidos.map(normalizar);
  return (req, res, next) => {
    if (!req.usuario || !permitidosNormalizados.includes(normalizar(req.usuario.cargo))) {
      return res.status(403).json({
        mensaje: 'No tienes permiso para esta acción según tu cargo. Si tu cargo cambió recientemente, vuelve a iniciar sesión.'
      });
    }
    next();
  };
};

module.exports = { verificarToken, verificarRol, verificarCargo };
