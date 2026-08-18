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

        // Normalizar: acepta 'RUC', 'ruc', ' Ruc ', etc.
        const tipoNorm = String(tipo).trim().toUpperCase();
        if (!['DNI', 'RUC'].includes(tipoNorm)) {
            return res.status(400).json({ success: false, mensaje: 'Tipo de documento inválido' });
        }

        const numeroLimpio = String(numero).trim();
        if (tipoNorm === 'DNI' && !/^\d{8}$/.test(numeroLimpio)) {
            return res.status(400).json({ success: false, mensaje: 'El DNI debe tener 8 dígitos' });
        }
        if (tipoNorm === 'RUC' && !/^\d{11}$/.test(numeroLimpio)) {
            return res.status(400).json({ success: false, mensaje: 'El RUC debe tener 11 dígitos' });
        }

        if (!process.env.APIS_PERU_TOKEN) {
            console.error('Falta configurar APIS_PERU_TOKEN en .env');
            return res.status(503).json({ success: false, mensaje: 'Servicio de consulta no disponible' });
        }

        const endpoint = tipoNorm.toLowerCase(); // 'dni' | 'ruc'
        const url = `${BASE_URL}/${endpoint}/${numeroLimpio}?token=${process.env.APIS_PERU_TOKEN}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        const data = await response.json().catch(() => null);

        // 🔎 LOG CLAVE PARA DIAGNOSTICAR: compara el status/body entre un
        // RUC que empiece en 10 y uno que empiece en 20 (ambos reales,
        // verificados en https://e-consultaruc.sunat.gob.pe).
        console.log('[apisperu]', endpoint, numeroLimpio, '-> status:', response.status, 'body:', data);

        if (!response.ok) {
            // Antes esto se tragaba como "no encontrado". Ahora se distingue
            // el motivo real (token vencido, límite del plan, etc.).
            if (response.status === 401 || response.status === 403) {
                return res.status(502).json({ success: false, mensaje: 'Token de consulta inválido o vencido (revisar APIS_PERU_TOKEN)' });
            }
            if (response.status === 429) {
                return res.status(502).json({ success: false, mensaje: 'Se agotó el límite de consultas del plan contratado en apisperu.com' });
            }
            return res.status(502).json({ success: false, mensaje: `apisperu.com respondió ${response.status}` });
        }

        const info = data?.data || data;

        if (tipoNorm === 'DNI' && (info?.nombres || info?.nombre_completo)) {
            return res.json({
                success: true,
                nombres: info.nombres,
                apellidoPaterno: info.apellido_paterno || info.apellidoPaterno,
                apellidoMaterno: info.apellido_materno || info.apellidoMaterno,
                nombreCompleto: info.nombre_completo
            });
        }

        if (tipoNorm === 'RUC' && (info?.razon_social || info?.nombre_o_razon_social || info?.razonSocial)) {
            return res.json({
                success: true,
                ruc: numeroLimpio,
                tipoContribuyente: numeroLimpio.startsWith('20') ? 'JURIDICA' : 'NATURAL',
                razonSocial: info.razon_social || info.nombre_o_razon_social || info.razonSocial,
                direccion: info.direccion_completa || info.direccion || ''
            });
        }

        return res.json({
            success: false,
            mensaje: `No se encontró el ${tipoNorm}, ingresa tus datos manualmente`
        });

    } catch (error) {
        console.error('Error consultando documento:', error);
        res.status(500).json({ success: false, mensaje: 'Error de conexión con el servicio' });
    }
};

module.exports = { consultarDocumento };
