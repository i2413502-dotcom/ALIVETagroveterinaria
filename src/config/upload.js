const multer = require('multer');

const storage = multer.memoryStorage(); // guarda en memoria, no en disco

// Solo se aceptan estos MIME types (rechazo ANTES de escribir en disco)
const MIMES_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const mimeOk = MIMES_PERMITIDOS.includes(file.mimetype);
        const extOk  = /\.(jpe?g|png|webp)$/i.test(file.originalname);
        if (mimeOk && extOk) {
            cb(null, true);
        } else {
            const err = new Error('Formato no permitido. Solo se aceptan imágenes JPEG, PNG o WEBP.');
            err.code = 'INVALID_FILE_TYPE';
            cb(err, false);
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// Configuración separada solo para fichas técnicas en PDF (ej. prospecto
// de un medicamento). No se mezcla con la de imágenes de arriba.
const uploadPdf = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const mimeOk = file.mimetype === 'application/pdf';
        const extOk  = /\.pdf$/i.test(file.originalname);
        if (mimeOk && extOk) {
            cb(null, true);
        } else {
            const err = new Error('Formato no permitido. Solo se aceptan archivos PDF.');
            err.code = 'INVALID_FILE_TYPE';
            cb(err, false);
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB (los PDF pesan más que una imagen)
});

module.exports = upload;
module.exports.pdf = uploadPdf;
