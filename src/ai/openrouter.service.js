// AgroBot usa únicamente el modelo de pago Hermes 3 405B.
// Los modelos gratuitos ignoran el system prompt y alucinan productos.
require('dotenv').config();

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const TIMEOUT_MS     = 30000;
const MODELO         = process.env.OPENROUTER_MODEL_3 || 'nousresearch/hermes-3-llama-3.1-405b';

const llamarModelo = async (mensajes) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const resp = await fetch(OPENROUTER_URL, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type':  'application/json',
                'HTTP-Referer':  'https://alivetagroveterinaria-web.onrender.com',
                'X-Title':       'AgroBot ALIVET'
            },
            body: JSON.stringify({
                model:       MODELO,
                messages:    mensajes,
                temperature: 0.1,   // lo más bajo posible: menos creatividad = menos alucinación
                max_tokens:  300
            })
        });

        if (!resp.ok) {
            const cuerpo = await resp.text();
            throw new Error(`OpenRouter ${resp.status}: ${cuerpo.slice(0, 200)}`);
        }

        const data  = await resp.json();
        const texto = data.choices?.[0]?.message?.content;
        if (!texto) throw new Error('Respuesta vacía del modelo');

        console.log(`[AgroBot] Respondido con: ${MODELO}`);
        return texto.trim();

    } finally {
        clearTimeout(timer);
    }
};

exports.chat = async (mensajes) => {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY no configurada');
    }
    return llamarModelo(mensajes);
};