# Usar Node.js como imagen base
FROM node:current-alpine3.21

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de Node.js
RUN npm ci && npm cache clean --force

# Copiar código fuente
COPY . .

# Env
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Construir la aplicación para producción
RUN npm run build

# Exponer puerto
EXPOSE 4173

# Comando para ejecutar la aplicación
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
