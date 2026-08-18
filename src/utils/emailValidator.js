const dns = require('dns').promises;

// Valida formato + que el dominio tenga registros MX (puede recibir correo).
// No garantiza que el buzón específico exista (eso requeriría SMTP o un
// servicio de pago tipo ZeroBounce/Abstract API), pero descarta dominios
// inexistentes o mal escritos (ej. "gmial.com", "hotmial.com"), que es el
// caso reportado: se enviaba el OTP igual aunque el correo no pudiera
// recibir nada.
async function validarCorreoExiste(correo) {
    const formatoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo || '');
    if (!formatoValido) {
        return { valido: false, motivo: 'Formato de correo inválido' };
    }

    const dominio = correo.split('@')[1];
    try {
        const registros = await dns.resolveMx(dominio);
        if (!registros || registros.length === 0) {
            return { valido: false, motivo: 'El dominio del correo no puede recibir mensajes' };
        }
        return { valido: true };
    } catch (err) {
        return { valido: false, motivo: 'El dominio del correo no existe' };
    }
}

module.exports = { validarCorreoExiste };
