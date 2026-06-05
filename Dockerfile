
# Usamos una imagen de Node que ya viene con herramientas de desarrollo listas (así evitamos apt-get)
FROM node:20

# Creamos el directorio de trabajo
WORKDIR /app

# Copiamos los archivos de configuración
COPY package*.json ./

# Instalamos las dependencias (construirá bcrypt usando lo que ya viene interno)
RUN npm install

# Copiamos el resto de tu código de la agroveterinaria
COPY . .

# Exponemos tu puerto
EXPOSE 10000

# Comando para iniciar
CMD ["npm", "start"]
