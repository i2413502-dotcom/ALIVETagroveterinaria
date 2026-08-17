const REGEX_FUERTE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const PASSWORDS_COMUNES = new Set([
    '12345678', '123456789', '1234567890', 'password', 'password1',
    'qwerty123', 'qwertyui', 'contraseña', 'contrasena', 'contrasena1',
    'admin123', 'abc12345', '11111111', '00000000', 'iloveyou1',
    'asdf1234', '12341234', 'letmein1', 'welcome1', 'alevet123'
]);

// Se utiliza para el móvil
function validarPassword(password, { nombres, usuario, correo } = {}) {
    if (typeof password !== 'string') {
        return { valida: false, mensaje: 'Contraseña inválida.' };
    }

    if (!REGEX_FUERTE.test(password)) {
        return {
            valida: false,
            mensaje: 'La contraseña debe tener al menos 8 caracteres, con letras, números y un carácter especial (ej: !@#$%).'
        };
    }

    const pLower = password.toLowerCase();

    if (PASSWORDS_COMUNES.has(pLower)) {
        return { valida: false, mensaje: 'Esa contraseña es demasiado común. Elige otra.' };
    }

    const partesProhibidas = [];
    if (nombres) {
        nombres.toLowerCase().split(/\s+/).forEach(parte => {
            if (parte.length >= 3) partesProhibidas.push(parte);
        });
    }
    if (usuario && usuario.length >= 3) partesProhibidas.push(usuario.toLowerCase());
    if (correo) {
        const local = correo.split('@')[0].toLowerCase();
        if (local.length >= 3) partesProhibidas.push(local);
    }

    for (const parte of partesProhibidas) {
        if (pLower.includes(parte)) {
            return {
                valida: false,
                mensaje: 'La contraseña no puede contener tu nombre, usuario o correo.'
            };
        }
    }

    return { valida: true };
}

module.exports = { validarPassword };
