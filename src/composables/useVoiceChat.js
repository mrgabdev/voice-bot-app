import { ref, computed, nextTick } from 'vue'

export function useVoiceChat() {
	// --- CONFIGURACIÓN DE DETECCIÓN DE SILENCIO ---
	const THRESHOLD = 1.5 // Umbral por encima del ruido ambiente (1.0 cuando callado)
	const SILENCE_TIMEOUT_MS = 2500 // 2.5 segundos de silencio para terminar
	const INITIAL_GRACE_PERIOD = 2000 // 2 segundos iniciales sin detección

	// --- REFERENCIAS DE TEMPLATE ---
	const chatContainer = ref(null)

	// --- ESTADO REACTIVO ---
	const isRecording = ref(false)
	const messages = ref([]) // Arreglo de mensajes del chat
	const audioLevel = ref(0) // Para mostrar nivel de audio en tiempo real
	const messageText = ref('') // Para el campo de texto
	const sessionId = ref(crypto.randomUUID()) // ID único para la sesión
	const showTextInput = ref(false) // Controla la visibilidad del input de texto

	// --- VARIABLES DE AUDIO ---
	let mediaRecorder = null
	let audioChunks = []
	let stream = null
	let audioContext = null
	let analyser = null
	let detectSilenceLoopId = null
	let recordingStartTime = 0
	let lastSoundTime = 0
	let synth = null

	// --- COMPUTED ---
	const pulseStyle = computed(() => {
		if (!isRecording.value) return {}

		const normalizedLevel = Math.min(audioLevel.value / 5.0, 1.0) // Máximo esperado ~5.0

		// Calcular intensidad del pulso basado en el nivel de audio
		const pulseIntensity = 0.1 + normalizedLevel * 0.4 // Rango: 0.1 - 0.5
		const scaleMultiplier = 1 + normalizedLevel * 0.2 // Rango: 1.0 - 1.2

		return {
			'--pulse-intensity': pulseIntensity,
			'--scale-multiplier': scaleMultiplier
		}
	})

	// --- FUNCIONES DE UTILIDAD ---

	// Función para hacer auto-scroll hacia abajo
	const scrollToBottom = async () => {
		await nextTick()
		if (chatContainer.value) {
			chatContainer.value.scrollTo({
				top: chatContainer.value.scrollHeight,
				behavior: 'smooth'
			})
		}
	}

	// Función para agregar mensaje al chat
	function addMessage(role, content) {
		messages.value.push({
			role,
			content,
			timestamp: new Date().toISOString()
		})
		// Auto-scroll hacia abajo después de agregar mensaje
		scrollToBottom()
	}

	// Función para formatear tiempo
	function formatTime(timestamp) {
		const date = new Date(timestamp)
		return date.toLocaleTimeString('es-ES', {
			hour: '2-digit',
			minute: '2-digit'
		})
	}

	// Función para convertir errores técnicos en mensajes amigables
	function getOrganicErrorMessage(error, context = 'general') {
		const errorText = error.message || error.toString()

		// Errores de red/conexión
		if (
			errorText.includes('Failed to fetch') ||
			errorText.includes('NetworkError')
		) {
			return '🔌 No puedo conectarme al servidor ahora mismo. ¿Podrías intentar de nuevo?'
		}

		// Errores 404
		if (errorText.includes('404') || errorText.includes('Not Found')) {
			return '🤔 Parece que el servicio no está disponible. ¿El servidor está funcionando?'
		}

		// Errores 500
		if (
			errorText.includes('500') ||
			errorText.includes('Internal Server Error')
		) {
			return '😅 Ups, algo salió mal en mi sistema. Inténtalo de nuevo en un momento.'
		}

		// Timeout
		if (errorText.includes('timeout') || errorText.includes('AbortError')) {
			return '⏱️ Estoy tardando más de lo normal. ¿Podrías intentar con un mensaje más corto?'
		}

		// Errores de permisos
		if (errorText.includes('NotAllowedError')) {
			return '🎤 Necesito permiso para usar tu micrófono. ¿Podrías habilitarlo en tu navegador?'
		}

		// Error de micrófono no encontrado
		if (errorText.includes('NotFoundError')) {
			return '🎙️ No puedo encontrar tu micrófono. ¿Está conectado correctamente?'
		}

		// Errores de audio específicos
		if (context === 'audio' && errorText.includes('Error')) {
			return '🎵 Hubo un problema procesando tu audio. ¿Podrías intentar hablar más claro?'
		}

		// Error genérico más amigable
		return '😊 Algo no salió como esperaba. ¿Podrías intentar de nuevo?'
	}

	function stripMarkdown(text) {
		return text
			.replace(/\*\*(.*?)\*\*/gs, '$1')
			.replace(/\*(.*?)\*/gs, '$1')
			.replace(/`(.*?)`/gs, '$1')
			.replace(/~~(.*?)~~/gs, '$1')
			.replace(/#{1,6}\s*(.*)/g, '$1')
			.replace(/^\s*[-+*]\s+/gm, '• ')
			.replace(/^\s*\d+\.\s+/gm, '• ')
			.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
			.trim()
	}

	// --- FUNCIONES DE AUDIO/TTS ---

	const speak = (text) => {
		stopSpeech()
		if ('speechSynthesis' in window) {
			const utterance = new SpeechSynthesisUtterance(stripMarkdown(text))
			utterance.lang = 'es-ES'
			utterance.rate = 1.0
			utterance.pitch = 1.0
			utterance.volume = 1.0
			synth = window.speechSynthesis
			synth.speak(utterance)
		}
	}

	const stopSpeech = () => {
		if (synth && 'speechSynthesis' in window) {
			window.speechSynthesis.cancel()
		}
	}

	// --- FUNCIONES DE DETECCIÓN DE SILENCIO ---

	const detectSilence = () => {
		if (!analyser) return

		// 1. Obtener datos de audio
		const dataArray = new Uint8Array(analyser.frequencyBinCount)
		analyser.getByteFrequencyData(dataArray)

		// 2. Calcular el nivel promedio
		const sum = dataArray.reduce((acc, val) => acc + val, 0)
		const average = sum / dataArray.length
		audioLevel.value = average / 10 // Normalizar para mostrar

		// 3. Verificar si hay sonido (por encima del umbral)
		if (average > THRESHOLD) {
			lastSoundTime = Date.now() // Actualizar tiempo del último sonido detectado
		}

		// 4. Verificar período de gracia inicial (no detectar silencio al inicio)
		const timeSinceStart = Date.now() - recordingStartTime
		if (timeSinceStart < INITIAL_GRACE_PERIOD) {
			// Durante el período de gracia, resetear lastSoundTime constantemente
			lastSoundTime = Date.now() // Mantener actualizado durante la gracia
			detectSilenceLoopId = requestAnimationFrame(detectSilence)
			return
		}

		// 5. Verificar si se ha superado el tiempo de silencio (después del período de gracia)
		const silenceDuration = Date.now() - lastSoundTime

		if (silenceDuration > SILENCE_TIMEOUT_MS) {
			finalizeRecording(true) // Parada automática
			return // Terminar el bucle
		}

		// 6. Continuar la verificación en el siguiente frame
		detectSilenceLoopId = requestAnimationFrame(detectSilence)
	}

	// --- FUNCIONES DE GRABACIÓN ---

	const startRecording = async () => {
		stopSpeech()

		try {
			// 1. Obtener el flujo de audio (Stream)
			stream = await navigator.mediaDevices.getUserMedia({ audio: true })

			// 2. Inicializar MediaRecorder
			mediaRecorder = new MediaRecorder(stream)
			audioChunks = []

			mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data)
			mediaRecorder.onstart = () => {
				isRecording.value = true
				recordingStartTime = Date.now() // Tiempo de inicio para período de gracia
				lastSoundTime = Date.now() // Reiniciar tiempo al comenzar
			}

			// 3. Iniciar AudioContext y Analizador
			audioContext = new (window.AudioContext || window.webkitAudioContext)()
			const source = audioContext.createMediaStreamSource(stream)
			analyser = audioContext.createAnalyser()

			source.connect(analyser)
			analyser.fftSize = 2048 // Configurar el analizador

			// 4. Iniciar la detección de silencio
			detectSilenceLoopId = requestAnimationFrame(detectSilence)

			mediaRecorder.onstop = async () => {
				// Este bloque se ejecuta después de que `finalizeRecording` llama a `mediaRecorder.stop()`

				if (audioChunks.length === 0) return

				// 🎙️ MOSTRAR MENSAJE TEMPORAL DE AUDIO INMEDIATAMENTE
				const tempUserMessage = {
					role: 'user',
					content: '🎤 Procesando audio...',
					timestamp: new Date().toISOString(),
					isTemporary: true
				}
				messages.value.push(tempUserMessage)
				scrollToBottom()

				const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
				const formData = new FormData()
				formData.append('file', audioBlob, 'voice.webm')
				formData.append('sessionId', sessionId.value)

				try {
					// Enviar al backend con timeout
					const controller = new AbortController()
					const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos timeout

					const res = await fetch(`${import.meta.env.VITE_API_URL}/movie`, {
						method: 'POST',
						body: formData,
						signal: controller.signal
					})

					clearTimeout(timeoutId)

					if (!res.ok) {
						const serverError = new Error(`${res.status} ${res.statusText}`)
						throw new Error(getOrganicErrorMessage(serverError, 'audio'))
					}

					const data = await res.json()

					// 🔄 ACTUALIZAR MENSAJE DE AUDIO CON TRANSCRIPCIÓN Y RESPUESTA
					// Encontrar el último mensaje temporal de audio y reemplazarlo con la transcripción
					const lastTempIndex = messages.value.findIndex(
						(msg) => msg.isTemporary && msg.role === 'user'
					)
					if (lastTempIndex !== -1) {
						// Extraer la transcripción del historial del servidor si está disponible
						if (
							data.history &&
							Array.isArray(data.history) &&
							data.history.length >= 2
						) {
							const userMessage = data.history[data.history.length - 2] // Penúltimo mensaje (usuario)
							const botMessage = data.history[data.history.length - 1] // Último mensaje (bot)

							// Reemplazar mensaje temporal con transcripción real
							messages.value[lastTempIndex] = {
								role: 'user',
								content: userMessage.content,
								timestamp: userMessage.timestamp
							}

							// Agregar respuesta del bot
							addMessage('model', botMessage.content)
						} else {
							// Fallback - usar la respuesta directa
							messages.value.splice(lastTempIndex, 1) // Quitar temporal
							const botResponse =
								stripMarkdown(data.response) ||
								'Error al obtener transcripción.'
							addMessage('model', botResponse)
						}
					}

					const botResponse =
						stripMarkdown(data.response) || 'Error al obtener transcripción.'
					speak(botResponse)
				} catch (fetchError) {
					console.error('Error enviando audio:', fetchError)

					// Remover mensaje temporal de audio
					messages.value = messages.value.filter((msg) => !msg.isTemporary)
					const organicError = getOrganicErrorMessage(fetchError, 'audio')
					addMessage('model', organicError)
					speak(organicError)
				}
			}

			// 5. Iniciar grabación
			mediaRecorder.start()
		} catch (error) {
			console.error('Error al iniciar grabación:', error)
			const organicError = getOrganicErrorMessage(error, 'audio')
			addMessage('model', organicError)
			speak(errorMsg)
		}
	}

	const finalizeRecording = (automatic = false) => {
		// Limpiar el bucle de detección de silencio
		if (detectSilenceLoopId) {
			cancelAnimationFrame(detectSilenceLoopId)
			detectSilenceLoopId = null
		}

		// Detener y cerrar AudioContext
		if (audioContext && audioContext.state !== 'closed') {
			audioContext.close()
			audioContext = null
		}

		// Detener MediaRecorder si está grabando
		if (mediaRecorder && mediaRecorder.state !== 'inactive') {
			mediaRecorder.stop()
		}

		// Detener el stream de audio
		if (stream) {
			stream.getTracks().forEach((track) => track.stop())
			stream = null
		}

		// Resetear estado
		isRecording.value = false
		audioLevel.value = 0
	}

	const stopRecording = () => {
		finalizeRecording(false)
	}

	// --- FUNCIONES DE MENSAJES DE TEXTO ---

	const sendTextMessage = async () => {
		if (!messageText.value.trim()) return

		stopSpeech()

		const message = messageText.value.trim()
		messageText.value = ''

		// 🚀 MOSTRAR MENSAJE DEL USUARIO INMEDIATAMENTE
		addMessage('user', message)

		try {
			// Agregar mensaje temporal "escribiendo..."
			const tempBotMessage = {
				role: 'model',
				content: '🤖 Procesando tu mensaje...',
				timestamp: new Date().toISOString(),
				isTemporary: true
			}
			messages.value.push(tempBotMessage)
			scrollToBottom()

			// Enviar al backend como texto
			const response = await fetch(
				`${import.meta.env.VITE_API_URL}/movie/text`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						text: message,
						sessionId: sessionId.value
					})
				}
			)

			if (!response.ok) {
				const serverError = new Error(
					`${response.status} ${response.statusText}`
				)
				throw new Error(getOrganicErrorMessage(serverError, 'text'))
			}

			const data = await response.json()

			// 🔄 REMOVER MENSAJE TEMPORAL Y AGREGAR RESPUESTA REAL
			// Quitar el mensaje temporal "escribiendo..."
			messages.value = messages.value.filter((msg) => !msg.isTemporary)

			// Agregar solo la respuesta del bot (el mensaje del usuario ya está)
			const botResponse =
				stripMarkdown(data.response) || 'Error al obtener respuesta.'
			addMessage('model', botResponse)
			speak(botResponse)
		} catch (error) {
			console.error('Error enviando mensaje:', error)
			// Remover mensaje temporal en caso de error
			messages.value = messages.value.filter((msg) => !msg.isTemporary)
			const organicError = getOrganicErrorMessage(error, 'text')
			addMessage('model', organicError)
			speak(organicError)
		}
	}

	// --- FUNCIONES DE UI ---

	const toggleTextInput = () => {
		showTextInput.value = !showTextInput.value
		if (!showTextInput.value) {
			messageText.value = ''
		}
	}

	const hideTextInput = () => {
		showTextInput.value = false
		messageText.value = ''
	}

	// --- CLEANUP ---

	const cleanup = () => {
		finalizeRecording()
		stopSpeech()
	}

	// Retornar todas las referencias y funciones que necesita el componente
	return {
		// Referencias reactivas
		chatContainer,
		isRecording,
		messages,
		audioLevel,
		messageText,
		sessionId,
		showTextInput,

		// Computed
		pulseStyle,

		// Funciones
		formatTime,
		stripMarkdown,
		speak,
		stopSpeech,
		startRecording,
		stopRecording,
		sendTextMessage,
		toggleTextInput,
		hideTextInput,
		cleanup,
		scrollToBottom,
		addMessage
	}
}
