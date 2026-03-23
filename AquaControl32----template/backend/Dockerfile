# Usar una imagen ligera de Node.js
FROM node:20-alpine

# Establecer el directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar el resto del código
COPY . .

# Exponer el puerto configurado
EXPOSE 4000

# Comando para iniciar la aplicación
CMD ["npm", "start"]
