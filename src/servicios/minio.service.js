const Minio = require('minio');

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: Number(process.env.MINIO_PORT) || 443,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const BUCKET = process.env.MINIO_BUCKET_NAME || 'alivetagroveterinaria';

async function uploadFile(fileBuffer, originalName, folder) {
  var ext = originalName.split('.').pop();
  var filename = Date.now() + '-' + Math.random().toString(36).substring(2, 8) + '.' + ext;
  var key = folder + '/' + filename;

  await minioClient.putObject(BUCKET, key, fileBuffer, fileBuffer.length, {
    'Content-Type': getContentType(ext),
  });

  // URL pública permanente (no expira) — requiere bucket con acceso público en R2
  if (process.env.MINIO_PUBLIC_URL) {
    var base = process.env.MINIO_PUBLIC_URL.replace(/\/$/, '');
    return `${base}/${key}`;
  }

  // Fallback: URL pre-firmada que expira en 7 días
  var url = await minioClient.presignedGetObject(BUCKET, key, 7 * 24 * 60 * 60);
  return url;
}

async function deleteFile(key) {
  await minioClient.removeObject(BUCKET, key);
}

function getContentType(ext) {
  var types = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
  };
  return types[ext.toLowerCase()] || 'application/octet-stream';
}

module.exports = { uploadFile: uploadFile, deleteFile: deleteFile };