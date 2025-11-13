FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY src ./src

# Compilar TypeScript
RUN npm run build

# Crear directorio de logs
RUN mkdir -p logs

# Exponer puerto (si agregas API REST en el futuro)
EXPOSE 3000

# Comando por defecto
CMD ["npm", "start"]
