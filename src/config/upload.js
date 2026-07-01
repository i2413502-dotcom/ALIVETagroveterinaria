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

module.exports = upload;
