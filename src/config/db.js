const mysql = require("mysql2/promise");
require("dotenv").config();

// Creamos un objeto de configuración base con lo que siempre se repite
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
};

// Preguntamos: ¿Estamos en Google Cloud Run? 
if (process.env.INSTANCE_CONNECTION_NAME) {
  // SI: Nos conectamos de forma interna mediante el Socket de Unix sin usar IP ni puertos
  dbConfig.socketPath = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
  console.log("Configurando conexión interna por Socket para GCP...");
} else {
  // NO: Estamos en tu computadora (Local) o en AlwaysData usando IP/Host clásico
  dbConfig.host = process.env.DB_HOST || "localhost";
  // Si en local usas un puerto diferente a 3306, puedes añadirlo aquí:
  // dbConfig.port = process.env.DB_PORT || 3306; 
}

// Creamos el pool con la configuración final seleccionada automáticamente
const pool = mysql.createPool(dbConfig);

pool.getConnection()
  .then(conn => {
    console.log("Conectado a MySQL correctamente");
    conn.release();
  })
  .catch(err => console.log("Error de conexion:", err));

module.exports = pool;
