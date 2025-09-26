<template>
	<v-container
		fluid
		class="chat-container d-flex flex-column pa-4"
		style="height: 100%"
	>
		<!-- Header -->
		<v-row class="flex-grow-0">
			<v-col cols="12">
				<div class="text-center py-2">
					<p class="text-subtitle-1 text-medium-emphasis mb-0">
						Habla o escribe tu mensaje sobre películas
					</p>
				</div>
			</v-col>
		</v-row>

		<!-- Chat Area -->
		<v-row class="flex-grow-1 overflow-hidden">
			<v-col cols="12">
				<v-card
					class="chat-area d-flex flex-column"
					height="100%"
					variant="text"
				>
					<v-card-text class="flex-grow-1 overflow-y-auto">
						<div v-if="transcript" class="message-container">
							<v-card
								class="message-bubble bot-message mb-3"
								color="primary"
								variant="tonal"
							>
								<v-card-text>
									<div v-html="transcript"></div>
								</v-card-text>
							</v-card>
						</div>
						<div v-else class="text-center py-8">
							<v-icon
								icon="mdi-chat-outline"
								size="64"
								class="text-medium-emphasis mb-4"
							></v-icon>
							<p class="text-h6 text-medium-emphasis">
								¡Comienza la conversación!
							</p>
						</div>
					</v-card-text>
				</v-card>
			</v-col>
		</v-row>

		<!-- Input Area -->
		<v-row class="flex-grow-0">
			<v-col cols="12">
				<v-card class="input-area" variant="elevated">
					<v-card-text class="pa-3">
						<!-- Modo solo micrófono (por defecto) -->
						<div
							v-if="!showTextInput"
							class="d-flex align-center justify-center gap-3"
						>
							<v-btn
								icon
								color="secondary"
								variant="outlined"
								@click="showTextInput = true"
								size="small"
								v-tooltip="'Escribir mensaje'"
							>
								<v-icon>mdi-keyboard</v-icon>
							</v-btn>

							<v-btn
								icon
								color="primary"
								@click="startRecording"
								:disabled="isRecording"
								size="x-large"
								class="recording-btn mx-4"
								:class="{ 'pulse-animation': isRecording }"
								:style="pulseStyle"
								v-tooltip="'Grabar mensaje de voz'"
							>
								<v-icon size="28">{{
									isRecording ? 'mdi-microphone' : 'mdi-microphone-outline'
								}}</v-icon>
							</v-btn>

							<div class="text-caption text-medium-emphasis">
								{{ isRecording ? 'Grabando...' : 'Presiona para hablar' }}
							</div>
						</div>

						<!-- Modo con input de texto -->
						<div v-else class="d-flex align-center gap-3">
							<v-text-field
								v-model="messageText"
								placeholder="Escribe tu mensaje..."
								variant="outlined"
								density="comfortable"
								hide-details
								class="flex-grow-1"
								@keyup.enter="sendTextMessage"
								:disabled="isRecording"
								autofocus
							>
								<template v-slot:prepend-inner>
									<v-icon
										icon="mdi-message-outline"
										class="text-medium-emphasis"
									></v-icon>
								</template>
							</v-text-field>

							<v-btn
								icon
								color="success"
								@click="sendTextMessage"
								:disabled="!messageText.trim() || isRecording"
								size="large"
								v-tooltip="'Enviar mensaje'"
							>
								<v-icon>mdi-send</v-icon>
							</v-btn>

							<v-divider vertical class="mx-2"></v-divider>

							<v-btn
								icon
								color="primary"
								@click="startRecording"
								:disabled="isRecording"
								size="large"
								class="recording-btn"
								:class="{ 'pulse-animation': isRecording }"
								:style="pulseStyle"
								v-tooltip="'Grabar mensaje de voz'"
							>
								<v-icon>{{
									isRecording ? 'mdi-microphone' : 'mdi-microphone-outline'
								}}</v-icon>
							</v-btn>

							<v-btn
								icon
								color="secondary"
								variant="text"
								@click=";(showTextInput = false), (messageText = '')"
								size="small"
								v-tooltip="'Ocultar teclado'"
							>
								<v-icon>mdi-close</v-icon>
							</v-btn>
						</div>
					</v-card-text>
				</v-card>
			</v-col>
		</v-row>
	</v-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// --- CONFIGURACIÓN DE DETECCIÓN DE SILENCIO ---
const THRESHOLD = 1.5 // Umbral por encima del ruido ambiente (1.0 cuando callado)
const SILENCE_TIMEOUT_MS = 2500 // 2.5 segundos de silencio para terminar
const INITIAL_GRACE_PERIOD = 2000 // 2 segundos iniciales sin detección

const isRecording = ref(false)
const transcript = ref('')
const audioLevel = ref(0) // Para mostrar nivel de audio en tiempo real
const messageText = ref('') // Para el campo de texto
const sessionId = ref(crypto.randomUUID()) // ID único para la sesión
const showTextInput = ref(false) // Controla la visibilidad del input de texto

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

let mediaRecorder = null
let audioChunks = []
let stream = null
let audioContext = null
let analyser = null
// Detección de silencio
let detectSilenceLoopId = null
let lastSoundTime = 0
let recordingStartTime = 0 // Para el período de gracia inicial

const handleBeforeUnload = () => {
	if (speechSynthesis.speaking) {
		speechSynthesis.cancel()
	}
}

onMounted(() => {
	if (speechSynthesis.speaking) {
		speechSynthesis.cancel()
	}

	window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
	window.removeEventListener('beforeunload', handleBeforeUnload)

	if (speechSynthesis.speaking) {
		speechSynthesis.cancel()
	}
})

/**
 * Función que detiene la grabación de forma segura, ya sea manual o automática.
 */
const finalizeRecording = async (isAutoStop = false) => {
	// Solo proceder si realmente está grabando o está en proceso de parar
	if (!mediaRecorder || mediaRecorder.state === 'inactive') return

	// 1. Detener el detector de silencio
	if (detectSilenceLoopId) {
		cancelAnimationFrame(detectSilenceLoopId)
		detectSilenceLoopId = null
	}

	// 2. Establecer el estado antes de llamar a mediaRecorder.stop()
	isRecording.value = false
	audioLevel.value = 0 // Resetear nivel de audio para detener la animación

	// 3. Detener MediaRecorder (esto dispara el evento onstop)
	if (mediaRecorder.state === 'recording') {
		mediaRecorder.stop()
	}

	// 4. Detener el uso del micrófono y cerrar el AudioContext
	if (stream) stream.getTracks().forEach((track) => track.stop())
	if (audioContext) await audioContext.close()
}

/**
 * Bucle recursivo para monitorear el nivel de audio y detectar silencio.
 */
const detectSilence = () => {
	if (!isRecording.value) return

	// 1. Obtener los datos de amplitud (tiempo-dominio)
	const bufferLength = analyser.frequencyBinCount
	const dataArray = new Uint8Array(bufferLength)
	analyser.getByteTimeDomainData(dataArray)

	// 2. Calcular el nivel máximo de amplitud
	let maxAmplitude = 0
	for (let i = 0; i < bufferLength; i++) {
		// Math.abs(dataArray[i] - 128) normaliza el valor (8-bit está centrado en 128)
		const amplitude = Math.abs(dataArray[i] - 128)
		if (amplitude > maxAmplitude) {
			maxAmplitude = amplitude
		}
	}

	// 3. Actualizar nivel visual y verificar si hay sonido
	audioLevel.value = Math.round(maxAmplitude * 1000) / 1000 // Redondear a 3 decimales

	const wasSilent = Date.now() - lastSoundTime > 1000 // Era silencio hace más de 1s?

	if (maxAmplitude > THRESHOLD) {
		// Solo log cuando cambia de silencio a sonido (para evitar spam)
		if (wasSilent) {
			console.log(
				`🎤 Voz detectada: ${maxAmplitude.toFixed(3)} (umbral: ${THRESHOLD})`
			)
		}
		lastSoundTime = Date.now() // Resetear el contador
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

const sendTextMessage = async () => {
	if (!messageText.value.trim()) return
	console.log(messageText.value)

	stopSpeech()

	const message = messageText.value.trim()
	messageText.value = ''

	try {
		transcript.value = '🤖 Procesando tu mensaje...'

		// Enviar al backend como texto
		const response = await fetch(`${import.meta.env.VITE_API_URL}/movie/text`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				text: message,
				sessionId: sessionId.value
			})
		})

		if (!response.ok) {
			throw new Error(
				`Error del servidor: ${response.status} ${response.statusText}`
			)
		}

		const data = await response.json()
		transcript.value =
			stripMarkdown(data.response) || 'Error al obtener respuesta.'
		speak(transcript.value)
	} catch (error) {
		console.error('Error enviando mensaje:', error)
		transcript.value = `Error: ${error.message}`
		speak(transcript.value)
	}
}

const startRecording = async () => {
	transcript.value = 'Escuchando...'

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
			console.log(
				'Grabación iniciada. Período de gracia:',
				INITIAL_GRACE_PERIOD + 'ms'
			)

			// 3. Iniciar AudioContext y Analizador
			audioContext = new (window.AudioContext || window.webkitAudioContext)()
			const source = audioContext.createMediaStreamSource(stream)
			analyser = audioContext.createAnalyser()

			source.connect(analyser)
			analyser.fftSize = 2048 // Configurar el analizador

			// 4. Iniciar la detección de silencio
			detectSilenceLoopId = requestAnimationFrame(detectSilence)
		}

		mediaRecorder.onstop = async () => {
			// Este bloque se ejecuta después de que `finalizeRecording` llama a `mediaRecorder.stop()`

			if (audioChunks.length === 0) return

			const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
			const formData = new FormData()
			formData.append('file', audioBlob, 'voice.webm')
			formData.append('sessionId', sessionId.value)

			try {
				// Enviar al backend con timeout
				const controller = new AbortController()
				const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 segundos timeout

				transcript.value = '🤖 Procesando tu mensaje...'

				const res = await fetch(`${import.meta.env.VITE_API_URL}/movie`, {
					method: 'POST',
					body: formData,
					signal: controller.signal
				})

				clearTimeout(timeoutId)

				if (!res.ok) {
					throw new Error(`Error del servidor: ${res.status} ${res.statusText}`)
				}

				const data = await res.json()
				console.log('Respuesta recibida:', data)

				transcript.value =
					stripMarkdown(data.response) || 'Error al obtener transcripción.'
				speak(transcript.value)
			} catch (fetchError) {
				console.error('Error enviando audio:', fetchError)

				if (fetchError.name === 'AbortError') {
					transcript.value =
						'Timeout: El servidor tardó demasiado en responder.'
				} else if (fetchError.message.includes('Failed to fetch')) {
					transcript.value = 'Error de conexión: ¿Está el servidor funcionando?'
				} else {
					transcript.value = `Error: ${fetchError.message}`
				}

				speak(transcript.value)
			}

			// Limpiar variables después de la finalización
			mediaRecorder = null
			stream = null
			audioContext = null
			analyser = null
		}

		// Iniciar la grabación (dispara onstart)
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
		if (error.name === 'NotAllowedError') {
			transcript.value =
				'Error: Permiso de micrófono denegado. Por favor, permite el acceso.'
		} else if (error.name === 'NotFoundError') {
			transcript.value =
				'Error: No se encontró micrófono. Verifica tu dispositivo.'
		} else {
			transcript.value = `Error iniciando grabación: ${error.message}`
		}

		speak(transcript.value)
	}
}

const stopRecording = () => {
	finalizeRecording(false)
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

function speak(text) {
	const utterance = new SpeechSynthesisUtterance(text)
	utterance.lang = 'es-ES' // Español
	utterance.volume = 1 // 0 a 1
	utterance.rate = 1 // velocidad
	utterance.pitch = 1 // tono
	speechSynthesis.speak(utterance)
}

function stopSpeech() {
	if (speechSynthesis.speaking) {
		speechSynthesis.cancel()
	}
}
</script>

<style scoped>
.text-center {
	text-align: center;
	padding: 20px;
}

/* Estilos para el botón de grabación con pulso reactivo */
.recording-button-container {
	position: relative;
	display: flex;
	justify-content: center;
	align-items: center;
}

.recording-btn {
	transition: all 0.2s ease-in-out;
	position: relative;
	overflow: hidden;
}

.recording-btn.pulse-animation {
	animation: audioReactivePulse 0.3s ease-in-out infinite alternate;
}

@keyframes audioReactivePulse {
	0% {
		box-shadow: 0 0 0 0 rgba(25, 118, 210, var(--pulse-intensity, 0.2));
		transform: scale(1);
	}
	100% {
		box-shadow: 0 0 0 20px rgba(25, 118, 210, 0);
		transform: scale(var(--pulse-scale, 1.1));
	}
}

/* Pulso de fondo cuando está grabando */
.recording-btn.pulse-animation::before {
	content: '';
	position: absolute;
	top: 50%;
	left: 50%;
	width: 100%;
	height: 100%;
	background: rgba(25, 118, 210, 0.1);
	border-radius: 50%;
	transform: translate(-50%, -50%) scale(0);
	animation: backgroundPulse 1s ease-in-out infinite;
}

@keyframes backgroundPulse {
	0% {
		transform: translate(-50%, -50%) scale(0);
		opacity: 1;
	}
	100% {
		transform: translate(-50%, -50%) scale(2);
		opacity: 0;
	}
}

/* Estilos para el nuevo layout de chat */
.chat-container {
	max-width: 1200px;
	margin: 0 auto;
}

.chat-area {
	min-height: 400px;
	border-radius: 16px !important;
}

.message-container {
	padding: 8px 0;
}

.message-bubble {
	max-width: 85%;
	border-radius: 18px !important;
	margin-left: auto;
}

.bot-message {
	margin-left: 0 !important;
	margin-right: auto !important;
}

.input-area {
	border-radius: 16px !important;
}

.recording-status {
	font-weight: bold;
	color: #c0392b; /* Rojo */
}
</style>
