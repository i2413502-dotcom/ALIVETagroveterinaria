require('dotenv').config();

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const TIMEOUT_MS = 30000;

// Orden de prioridad
const MODELOS = [
    process.env.OPENROUTER_MODEL_3 || 'nousresearch/hermes-3-llama-3.1-405b',

    // Respaldos gratuitos
    'meta-llama/llama-3.3-70b-instruct:free',
    'qwen/qwen3-32b:free',
    'mistralai/mistral-small-3.2-24b-instruct:free',
    'deepseek/deepseek-r1-0528:free'
];

const llamarModelo = async (modelo, mensajes) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const resp = await fetch(OPENROUTER_URL, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://alivetagroveterinaria-web.onrender.com',
                'X-Title': 'AgroBot ALIVET'
            },
            body: JSON.stringify({
                model: modelo,
                messages: mensajes,
                temperature: 0.1,
                max_tokens: 300
            })
        });

        if (!resp.ok) {
            const cuerpo = await resp.text();
            const error = new Error(`OpenRouter ${resp.status}: ${cuerpo.slice(0, 200)}`);
            error.status = resp.status;
            throw error;
        }

        const data = await resp.json();
        const texto = data.choices?.[0]?.message?.content;

        if (!texto) {
            throw new Error('Respuesta vacía del modelo');
        }

        console.log(`[AgroBot] Respondido con: ${modelo}`);
        return texto.trim();

    } finally {
        clearTimeout(timer);
    }
};

exports.chat = async (mensajes) => {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY no configurada');
    }

    let ultimoError;

    for (const modelo of MODELOS) {
        try {
            return await llamarModelo(modelo, mensajes);

        } catch (err) {
            ultimoError = err;

            if (err.status === 429 || err.status === 503) {
                console.warn(`[AgroBot] ${modelo} saturado (${err.status}), probando siguiente...`);

                // Espera breve antes del siguiente intento
                await new Promise(r => setTimeout(r, 700));

                continue;
            }

            throw err;
        }
    }

    console.error('[AgroBot] Todos los modelos fallaron.');
    throw ultimoError;
};
