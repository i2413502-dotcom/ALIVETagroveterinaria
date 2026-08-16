// Configuración que el frontend necesita conocer en tiempo de carga.
// SOLO valores seguros de exponer públicamente (por eso "publico"):
// la llave PÚBLICA de Culqi está diseñada para vivir en el navegador,
// a diferencia de CULQI_SECRET_KEY que jamás debe salir del backend.
exports.publico = (req, res) => {
    res.json({
        culqi_public_key: process.env.CULQI_PUBLIC_KEY || null
    });
};
