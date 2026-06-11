// Capa 1 (Invitado): búsqueda en la base de conocimiento local.
// Cero consumo de API — todo se resuelve contra el JSON.
const base = require('./knowledge-base.json');

// Normaliza texto: minúsculas y sin tildes, para que "envío" matchee "envio"
const normalizar = (texto) =>
    texto.toLowerCase()
         .normalize('NFD')
         .replace(/[̀-ͯ]/g, '');

// Devuelve la FAQ con más palabras clave coincidentes (mínimo 1)
exports.buscarRespuesta = (mensaje) => {
    const msg = normalizar(mensaje);

    let mejor = null;
    let mejorPuntaje = 0;

    for (const faq of base.faqs) {
        let puntaje = 0;
        for (const palabra of faq.palabras_clave) {
            if (msg.includes(normalizar(palabra))) puntaje++;
        }
        if (puntaje > mejorPuntaje) {
            mejorPuntaje = puntaje;
            mejor = faq;
        }
    }

    return mejor ? mejor.respuesta : base.respuesta_por_defecto;
};

// Lista de preguntas para mostrar como chips en el widget
exports.listarPreguntas = () =>
    base.faqs.map(f => ({ id: f.id, pregunta: f.pregunta }));

// Respuesta directa por id (cuando el invitado hace clic en un chip)
exports.respuestaPorId = (id) => {
    const faq = base.faqs.find(f => f.id === Number(id));
    return faq ? faq.respuesta : base.respuesta_por_defecto;
};
