# Voice Bot App 🎬🤖

Una aplicación interactiva de chat por voz que te permite conversar sobre películas usando inteligencia artificial. Habla sobre tus películas favoritas y obtén recomendaciones personalizadas.

## ✨ Características

- **Chat por Voz**: Interactúa usando comandos de voz naturales
- **IA Conversacional**: Powered by Google Gemini AI para conversaciones inteligentes
- **Información de Películas**: Integración con OMDB API para datos detallados
- **Interfaz Moderna**: Construido con Vue.js 3 + Vuetify
- **Detección de Silencio**: Grabación automática que se detiene cuando dejas de hablar

## 🎯 Uso Importante

**⚠️ Títulos de Películas en Inglés**: Para obtener los mejores resultados, utiliza los títulos de las películas en inglés cuando hables con el bot. La base de datos OMDB funciona principalmente con títulos originales en inglés.

### Ejemplos:

- ✅ "Tell me about Inception"
- ✅ "What do you think about The Dark Knight?"
- ❌ "Háblame sobre El Origen" (puede no encontrar resultados)

## 🚀 Inicio Rápido

### Prerequisitos

- Node.js 16+
- npm o yarn

### Instalación

1. **Clona el repositorio**:

```bash
git clone <repository-url>
cd voice-bot-app
```

2. **Instala las dependencias**:

```bash
npm install
```

3. **Configura las variables de entorno**:
   Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_API_URL=http://localhost:3000
```

4. **Inicia el servidor de desarrollo**:

```bash
npm run dev
```

5. **Abre tu navegador**:
   Visita `http://localhost:5173`

## 🐳 Docker

También puedes ejecutar la aplicación usando Docker:

```bash
# Construir y ejecutar con docker-compose
docker compose up --build
```

## 🛠️ Tecnologías

- **Frontend**: Vue.js 3, Vuetify, TypeScript, Vite
- **Composables**: Patrón de composición para lógica reutilizable
- **APIs**: Web Speech API, MediaRecorder API
- **Build**: Vite para desarrollo rápido y builds optimizados

## 📁 Estructura del Proyecto

```
src/
├── components/
│   ├── VoiceApp.vue          # Componente principal del chat
│   └── useVoiceChat.js       # Composable con lógica del chat
├── App.vue                   # Componente raíz
├── main.ts                   # Punto de entrada
└── style.css                # Estilos globales
```

## 🎮 Cómo Usar

1. **Permite el acceso al micrófono** cuando se te solicite
2. **Haz clic en el botón de micrófono** para iniciar la grabación
3. **Habla naturalmente** sobre películas (recuerda usar títulos en inglés)
4. **La grabación se detiene automáticamente** cuando dejas de hablar
5. **Espera la respuesta** del bot con información y recomendaciones

### Comandos de Voz Sugeridos:

- "What movies do you recommend for tonight?"
- "Tell me about Interstellar"
- "I want to watch a comedy movie"
- "What's the rating of The Matrix?"

## 🔧 Desarrollo

### Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Linting
npm run lint
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.
