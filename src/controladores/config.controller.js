// Configuración que el frontend necesita conocer en tiempo de carga.
// SOLO valores seguros de exponer públicamente (por eso "publico"):
// la Public Key de Mercado Pago está diseñada para vivir en el navegador,
// a diferencia de MP_ACCESS_TOKEN que jamás debe salir del backend.
exports.publico = (req, res) => {
    res.json({
        mp_public_key: process.env.MP_PUBLIC_KEY || null
    });
};
