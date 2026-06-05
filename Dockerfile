
# 1. Usamos una imagen de Node basada en Debian (es más compatible y rápida para librerías como bcrypt)
FROM node:20-slim

# 2. Instalamos las herramientas que bcrypt necesita para compilarse rápido
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 3. Creamos el directorio de trabajo
WORKDIR /app

# 4. Copiamos y configuramos las dependencias
COPY package*.json ./
RUN npm install --omit=dev

# 5. Copiamos el resto del código
COPY . .

# 6. Tu puerto personalizado
EXPOSE 10000

# 7. El comando de arranque oficial de tu package.json
CMD ["npm", "start"]
