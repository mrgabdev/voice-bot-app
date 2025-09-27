import { ref, computed, nextTick } from 'vue'

export function useVoiceChatSimple() {
	// --- CONFIGURACIÓN DE DETECCIÓN DE SILENCIO ---
	const THRESHOLD = 1.5 // Umbral por encima del ruido ambiente (1.0 cuando callado)
	const SILENCE_TIMEOUT_MS = 2500 // 2.5 segundos de silencio para terminar
	const INITIAL_GRACE_PERIOD = 2000 // 2 segundos iniciales sin detección

	// --- REFERENCIAS DE TEMPLATE ---
	const chatContainer = ref(null)

	// --- ESTADO REACTIVO ---
	const isRecording = ref(false)
	const isProcessing = ref(false) // Para deshabilitar botones durante fetch
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

	// --- COMPUTED ---
	const pulseStyle = computed(() => {
		if (!isRecording.value) return {}

		const normalizedLevel = Math.min(audioLevel.value / 5.0, 1.0) // Máximo esperado ~5.0

		// Calcular intensidad del pulso basado en el nivel de audio
		const pulseIntensity = 0.1 + normalizedLevel * 0.4 // Rango: 0.1 - 0.5
		const scaleMultiplier = 1 + normalizedLevel * 0.2 // Rango: 1.0 - 1.2

		return {
			'--pulse-intensity': pulseIntensity,
			'--pulse-scale': scaleMultiplier,
			transform: `scale(${scaleMultiplier})`
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

	function stripMarkdown(text) {
		return text
			.replace(/\*\*(.*?)\*\*/gs, '$1')
			.replace(/\*(.*?)\*/gs, '$1')
			.replace(/_(.*?)_/gs, '$1')
			.replace(/~~(.*?)~~/gs, '$1')
			.replace(/:(?!\s)/g, ': ')
			.replace(/\n/g, ' ')
	}

	// --- FUNCIONES DE AUDIO/TTS ---

	const speak = (text) => {
		if (speechSynthesis.speaking) {
			speechSynthesis.cancel()
		}
		const utterance = new SpeechSynthesisUtterance(text)
		utterance.lang = 'es-ES'
		utterance.volume = 1
		utterance.rate = 1
		utterance.pitch = 1
		speechSynthesis.speak(utterance)
	}

	const stopSpeech = () => {
		if (speechSynthesis.speaking) {
			speechSynthesis.cancel()
		}
	}

	// --- FUNCIONES DE DETECCIÓN DE SILENCIO ---

	const detectSilence = () => {
		if (!isRecording.value) return

		// 1. Obtener los datos de amplitud (tiempo-dominio)
		const bufferLength = analyser.frequencyBinCount
		const dataArray = new Uint8Array(bufferLength)
		analyser.getByteTimeDomainData(dataArray)

		// 2. Calcular el nivel máximo de amplitud
		let maxAmplitude = 0
		for (let i = 0; i < bufferLength; i++) {
			const amplitude = Math.abs(dataArray[i] - 128)
			if (amplitude > maxAmplitude) {
				maxAmplitude = amplitude
			}
		}

		// 3. Actualizar nivel visual y verificar si hay sonido
		audioLevel.value = Math.round(maxAmplitude * 1000) / 1000

		if (maxAmplitude > THRESHOLD) {
			lastSoundTime = Date.now()
		}

		// 4. Verificar período de gracia inicial
		const timeSinceStart = Date.now() - recordingStartTime
		if (timeSinceStart < INITIAL_GRACE_PERIOD) {
			lastSoundTime = Date.now()
			detectSilenceLoopId = requestAnimationFrame(detectSilence)
			return
		}

		// 5. Verificar si se ha superado el tiempo de silencio
		const silenceDuration = Date.now() - lastSoundTime

		if (silenceDuration > SILENCE_TIMEOUT_MS) {
			finalizeRecording(true) // Parada automática
			return
		}

		// 6. Continuar la verificación en el siguiente frame
		detectSilenceLoopId = requestAnimationFrame(detectSilence)
	}

	// --- FUNCIONES DE GRABACIÓN ---

	const finalizeRecording = async (isAutoStop = false) => {
		// Solo proceder si realmente está grabando
		if (!mediaRecorder || mediaRecorder.state === 'inactive') return

		// 1. Detener el detector de silencio
		if (detectSilenceLoopId) {
			cancelAnimationFrame(detectSilenceLoopId)
			detectSilenceLoopId = null
		}

		// 2. Establecer el estado antes de llamar a mediaRecorder.stop()
		isRecording.value = false
		audioLevel.value = 0

		// 3. Detener MediaRecorder (esto dispara el evento onstop)
		if (mediaRecorder.state === 'recording') {
			mediaRecorder.stop()
		}

		// 4. Detener el uso del micrófono y cerrar el AudioContext
		if (stream) stream.getTracks().forEach((track) => track.stop())
		if (audioContext) await audioContext.close()
	}

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
				recordingStartTime = Date.now()
				lastSoundTime = Date.now()

				// 3. Iniciar AudioContext y Analizador DENTRO del onstart
				audioContext = new (window.AudioContext || window.webkitAudioContext)()
				const source = audioContext.createMediaStreamSource(stream)
				analyser = audioContext.createAnalyser()

				source.connect(analyser)
				analyser.fftSize = 2048

				// 4. Iniciar la detección de silencio
				detectSilenceLoopId = requestAnimationFrame(detectSilence)
			}

			mediaRecorder.onstop = async () => {
				if (audioChunks.length === 0) return

				// Agregar mensaje temporal del usuario y activar estado de procesamiento
				addMessage('user', '🎤 Procesando audio...')
				isProcessing.value = true

				const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
				const formData = new FormData()
				formData.append('file', audioBlob, 'voice.webm')
				formData.append('sessionId', sessionId.value)

				try {
					const controller = new AbortController()
					const timeoutId = setTimeout(() => controller.abort(), 30000)

					const res = await fetch(`${import.meta.env.VITE_API_URL}/movie`, {
						method: 'POST',
						body: formData,
						signal: controller.signal
					})

					clearTimeout(timeoutId)

					if (!res.ok) {
						throw new Error(
							`Error del servidor: ${res.status} ${res.statusText}`
						)
					}

					const data = await res.json()
					console.log('Respuesta recibida:', data)

					// Extraer la transcripción y respuesta del historial si está disponible
					if (
						data.history &&
						Array.isArray(data.history) &&
						data.history.length >= 2
					) {
						const userMessage = data.history[data.history.length - 2] // Penúltimo mensaje (usuario)
						const botMessage = data.history[data.history.length - 1] // Último mensaje (bot)

						// Actualizar el último mensaje temporal con la transcripción real
						if (messages.value.length > 0) {
							messages.value[messages.value.length - 1] = {
								role: 'user',
								content: userMessage.content,
								timestamp: userMessage.timestamp
							}
						}

						// Agregar respuesta del bot
						addMessage('model', botMessage.content)
						speak(botMessage.content)
					} else {
						// Fallback - usar la respuesta directa
						const botResponse =
							stripMarkdown(data.response) || 'Error al obtener transcripción.'

						// Quitar mensaje temporal y agregar transcripción + respuesta
						if (messages.value.length > 0) {
							messages.value[messages.value.length - 1] = {
								role: 'user',
								content: 'Audio procesado',
								timestamp: new Date().toISOString()
							}
						}
						addMessage('model', botResponse)
						speak(botResponse)
					}

					// Desactivar estado de procesamiento al completar exitosamente
					isProcessing.value = false
				} catch (fetchError) {
					console.error('Error enviando audio:', fetchError)

					let errorMsg
					if (fetchError.name === 'AbortError') {
						errorMsg = 'Timeout: El servidor tardó demasiado en responder.'
					} else if (fetchError.message.includes('Failed to fetch')) {
						errorMsg = 'Error de conexión: ¿Está el servidor funcionando?'
					} else {
						errorMsg = `Error: ${fetchError.message}`
					}

					// Quitar mensaje temporal y agregar error
					if (messages.value.length > 0) {
						messages.value.pop() // Quitar el mensaje temporal
					}
					addMessage('model', errorMsg)
					speak(errorMsg)

					// Desactivar estado de procesamiento en caso de error
					isProcessing.value = false
				}

				// Limpiar variables después de la finalización
				mediaRecorder = null
				stream = null
				audioContext = null
				analyser = null
			}

			// Iniciar la grabación
			mediaRecorder.start()
		} catch (error) {
			console.error('Error al iniciar la grabación:', error)
			isRecording.value = false

			// Limpiar recursos si hay error
			if (stream) {
				stream.getTracks().forEach((track) => track.stop())
				stream = null
			}
			if (audioContext) {
				await audioContext.close()
				audioContext = null
			}

			// Mensajes específicos según el tipo de error
			let errorMsg
			if (error.name === 'NotAllowedError') {
				errorMsg =
					'Error: Permiso de micrófono denegado. Por favor, permite el acceso.'
			} else if (error.name === 'NotFoundError') {
				errorMsg = 'Error: No se encontró micrófono. Verifica tu dispositivo.'
			} else {
				errorMsg = `Error iniciando grabación: ${error.message}`
			}

			// Reemplazar último mensaje con error
			if (messages.value.length > 0) {
				messages.value[messages.value.length - 1] = {
					role: 'model',
					content: errorMsg,
					timestamp: new Date().toISOString()
				}
				scrollToBottom()
			}

			speak(errorMsg)
		}
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

		// Mostrar mensaje del usuario
		addMessage('user', message)

		try {
			// Agregar mensaje "procesando..." y activar estado de procesamiento
			addMessage('model', '🤖 Procesando tu mensaje...')
			isProcessing.value = true

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
				throw new Error(
					`Error del servidor: ${response.status} ${response.statusText}`
				)
			}

			const data = await response.json()

			// Reemplazar mensaje temporal con la respuesta
			const botResponse =
				stripMarkdown(data.response) || 'Error al obtener respuesta.'
			if (messages.value.length > 0) {
				messages.value[messages.value.length - 1] = {
					role: 'model',
					content: botResponse,
					timestamp: new Date().toISOString()
				}
				scrollToBottom()
			}

			speak(botResponse)

			// Desactivar estado de procesamiento al completar exitosamente
			isProcessing.value = false
		} catch (error) {
			console.error('Error enviando mensaje:', error)

			// Reemplazar mensaje temporal con error
			if (messages.value.length > 0) {
				messages.value[messages.value.length - 1] = {
					role: 'model',
					content: `Error: ${error.message}`,
					timestamp: new Date().toISOString()
				}
				scrollToBottom()
			}

			speak(`Error: ${error.message}`)

			// Desactivar estado de procesamiento en caso de error
			isProcessing.value = false
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
		isProcessing,
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
