# Voice Bot Frontend - Docker

## 🚀 Ejecución rápida

```bash
# Construir y ejecutar
docker compose up --build

# La aplicación estará disponible en:
# http://localhost:4173
```

## 📋 Comandos básicos

```bash
# Solo construir
docker build -t voice-bot-frontend .

# Ejecutar contenedor
docker run -p 4173:4173 voice-bot-frontend

# Ver logs
docker compose logs -f

# Parar
docker compose down
```

## ⚡ Desarrollo local

Para desarrollo, es mejor usar directamente:

```bash
npm install
npm run dev  # Puerto 5173
```
