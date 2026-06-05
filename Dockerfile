
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Aquí cambiamos al puerto 10000 que tú usas
EXPOSE 10000

# Aquí le decimos que arranque directamente tu archivo app.js
CMD ["node", "src/app.js"]
