// Cascada de modelos para AgroBot:
// 1) Llama 3.3 70B (gratis)  → mejor para español + instrucciones complejas
// 2) Qwen3 80B A3B (gratis)  → MoE eficiente, buen razonamiento, fallback
// 3) Hermes 3 405B  (pago)   → máxima calidad como último recurso, costo mínimo en <10 usuarios/día
require('dotenv').config();

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const TIMEOUT_MS = 30000; // 30s por intento

const CASCADA = [
    process.env.OPENROUTER_MODEL_1 || 'meta-llama/llama-3.3-70b-instruct:free',
    process.env.OPENROUTER_MODEL_2 || 'qwen/qwen3-next-80b-a3b-instruct:free',
    process.env.OPENROUTER_MODEL_3 || 'nousresearch/hermes-3-llama-3.1-405b'
];

// Llama a un modelo específico. Lanza error si falla (para pasar al siguiente).
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
                temperature: 0.3,   // baja: respuestas consistentes, menos invención
                max_tokens: 500
            })
        });

        if (!resp.ok) {
            const cuerpo = await resp.text();
            throw new Error(`OpenRouter ${resp.status} con ${modelo}: ${cuerpo.slice(0, 200)}`);
        }

        const data = await resp.json();
        const texto = data.choices?.[0]?.message?.content;
        if (!texto) throw new Error(`Respuesta vacía de ${modelo}`);

        return texto.trim();
    } finally {
        clearTimeout(timer);
    }
};

// Recorre la cascada hasta obtener respuesta. Si todos fallan, lanza error.
exports.chat = async (mensajes) => {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY no configurada');
    }

    let ultimoError = null;
    for (const modelo of CASCADA) {
        try {
            const respuesta = await llamarModelo(modelo, mensajes);
            console.log(`[AgroBot] Respuesta generada con: ${modelo}`);
            return respuesta;
        } catch (err) {
            console.warn(`[AgroBot] Falló ${modelo}: ${err.message}`);
            ultimoError = err;
        }
    }
    throw ultimoError || new Error('Todos los modelos de la cascada fallaron');
};
