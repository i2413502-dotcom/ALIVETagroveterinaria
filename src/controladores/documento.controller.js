// Consulta de DNI/RUC contra la API de apisperu.com (Reniec/Sunat)
//
// IMPORTANTE: el token de esta API vivía hardcodeado directamente en el
// código fuente (visible para cualquiera con acceso al repositorio). Se
// movió a la variable de entorno APIS_PERU_TOKEN. Si este proyecto
// estuvo en un repositorio (aunque sea privado) con ese token expuesto,
// trátalo como comprometido y genera uno nuevo en apisperu.com.
const BASE_URL = 'https://dniruc.apisperu.com/api/v1';

const consultarDocumento = async (req, res) => {
    try {
        const { tipo, numero } = req.query;

        if (!tipo || !numero) {
            return res.status(400).json({ success: false, mensaje: 'Faltan parámetros' });
        }

        if (!process.env.APIS_PERU_TOKEN) {
            console.error('Falta configurar APIS_PERU_TOKEN en .env');
            return res.status(503).json({ success: false, mensaje: 'Servicio de consulta no disponible' });
        }

        const endpoint = tipo.toLowerCase();
        const url = `${BASE_URL}/${endpoint}/${numero}?token=${process.env.APIS_PERU_TOKEN}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        // Algunos planes de apisperu.com devuelven el objeto directo, otros dentro de "data"
        const info = data.data || data;

        if (tipo === 'DNI' && (info.nombres || info.nombre_completo)) {
            return res.json({
                success: true,
                nombres: info.nombres,
                apellidoPaterno: info.apellido_paterno || info.apellidoPaterno,
                apellidoMaterno: info.apellido_materno || info.apellidoMaterno,
                nombreCompleto: info.nombre_completo
            });
        } else if (tipo === 'RUC' && (info.razon_social || info.nombre_o_razon_social || info.razonSocial)) {
            return res.json({
                success: true,
                razonSocial: info.razon_social || info.nombre_o_razon_social || info.razonSocial,
                direccion: info.direccion_completa || info.direccion
            });
        }

        return res.json({
            success: false,
            mensaje: `No se encontró el ${tipo}, ingresa tus datos manualmente`
        });

    } catch (error) {
        console.error('Error consultando documento:', error);
        res.status(500).json({ success: false, mensaje: 'Error de conexión con el servicio' });
    }
};

module.exports = { consultarDocumento };
