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

### Comandos sugeridos - Puede ser en ingles o español:

**Búsquedas de películas específicas:**

- "Tell me about Inception"
- "Search for The Dark Knight"
- "What do you know about Interstellar?"
- "Find information about Avatar"

**Búsquedas basadas en contexto y conversación previa:**

- "Compare the last two movies we discussed"
- "Save the last movie you mentioned to my list"

**Búsquedas con filtros OMDB:**

- "Search for Batman movies from 2008"
- "Find movies called Spiderman from 2002"
- "Search for series called Breaking Bad"
- "Look for the movie Joker from 2019"

**Gestión de favoritos:**

- "Save Inception to my list"
- "Add The Dark Knight to my list"
- "Show me my saved movies"
- "What movies do I have in my list?"

**Información detallada:**

- "Give me the plot of The Matrix"
- "Who directed Pulp Fiction?"
- "What's the rating of Forrest Gump?"
- "When was Titanic released?"

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
