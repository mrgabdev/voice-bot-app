<template>
	<div class="voice-app-layout">
		<!-- Header (solo informativo, no fijo) -->
		<div class="chat-header">
			<div class="text-center py-3">
				<p class="text-subtitle-1 text-medium-emphasis mb-0">
					Habla o escribe tu mensaje sobre películas
				</p>
			</div>
		</div>

		<!-- Chat Messages Area (con scroll) -->
		<div ref="chatContainer" class="chat-messages-area">
			<v-container fluid class="pa-4">
				<div v-if="messages.length > 0" class="messages-list">
					<div v-for="(message, index) in messages" :key="index" class="mt-5">
						<v-card
							:class="{
								'message-bubble user-message ml-8': message.role === 'user',
								'message-bubble bot-message mr-8': message.role === 'model'
							}"
							:color="
								message.role === 'user' ? 'green-darken-1' : 'blue-darken-2'
							"
							variant="tonal"
							class="position-relative"
						>
							<v-card-text>
								<div v-html="message.content"></div>
								<div class="d-flex align-center justify-space-between mt-3">
									<v-chip
										:color="
											message.role === 'user'
												? 'green-darken-1'
												: 'blue-darken-2'
										"
										size="x-small"
										variant="flat"
										:class="{
											'corner-chip-right': message.role === 'user',
											'corner-chip-left': message.role === 'model'
										}"
									>
										{{ message.role === 'user' ? 'Tú' : 'Bot' }}
									</v-chip>
									<div class="text-caption text-medium-emphasis mt-1">
										{{ formatTime(message.timestamp) }}
									</div>
								</div>
							</v-card-text>
						</v-card>
					</div>
				</div>
				<div v-else class="empty-state text-center py-8">
					<v-icon
						icon="mdi-chat-outline"
						size="64"
						class="text-medium-emphasis mb-4"
					></v-icon>
					<p class="text-h6 text-medium-emphasis">¡Comienza la conversación!</p>
				</div>
			</v-container>
		</div>

		<!-- Fixed Input Area -->
		<div class="input-area-fixed">
			<!-- Tip sobre títulos en inglés -->
			<v-container fluid class="pa-2">
				<v-card variant="elevated" class="input-card">
					<v-alert
						variant="tonal"
						type="info"
						density="compact"
						icon="mdi-information-outline"
					>
						<div class="d-flex align-center">
							<v-icon class="mr-2" size="16">mdi-translate</v-icon>
							<span class="text-caption">
								<strong>💡 Tip:</strong> Para mejores resultados, usa los
								títulos de películas en inglés (ej: "The Dark Knight" en lugar
								de "El Caballero Oscuro")
							</span>
						</div>
					</v-alert>
					<v-card-text class="pa-2">
						<!-- Modo solo micrófono (por defecto) -->
						<div
							v-if="!showTextInput"
							class="d-flex align-center justify-center gap-2"
						>
							<v-btn
								icon
								color="secondary"
								variant="text"
								@click="showTextInput = true"
								:disabled="isRecording || isProcessing"
								size="small"
								v-tooltip="'Escribir mensaje'"
							>
								<v-icon size="20">mdi-keyboard</v-icon>
							</v-btn>

							<v-btn
								icon
								color="primary"
								@click="startRecording"
								:disabled="isRecording || isProcessing"
								size="large"
								class="recording-btn mx-2"
								:class="{ 'pulse-animation': isRecording }"
								:style="pulseStyle"
								v-tooltip="'Grabar mensaje de voz'"
							>
								<v-icon size="24">{{
									isRecording ? 'mdi-microphone' : 'mdi-microphone-outline'
								}}</v-icon>
							</v-btn>

							<div
								class="text-caption text-medium-emphasis"
								style="font-size: 0.75rem"
							>
								{{
									isProcessing
										? 'Procesando...'
										: isRecording
										? 'Grabando...'
										: 'Toca para hablar'
								}}
							</div>
						</div>

						<!-- Modo con input de texto -->
						<div v-else class="d-flex align-center justify-center gap-2">
							<v-textarea
								v-model="messageText"
								placeholder="Escribe..."
								variant="outlined"
								density="compact"
								hide-details
								class="compact-input"
								:disabled="isRecording || isProcessing"
								autofocus
								auto-grow
								rows="1"
								max-rows="4"
								style="max-width: 50%; min-width: 200px"
							></v-textarea>

							<v-btn
								icon
								color="success"
								@click="sendTextMessage"
								:disabled="!messageText.trim() || isRecording || isProcessing"
								size="default"
								v-tooltip="'Enviar mensaje'"
								class="ml-2"
							>
								<v-icon size="20">mdi-send</v-icon>
							</v-btn>

							<v-divider vertical class="mx-2"></v-divider>

							<v-btn
								icon
								color="primary"
								@click="startRecording"
								:disabled="isRecording || isProcessing"
								size="default"
								class="recording-btn"
								:class="{ 'pulse-animation': isRecording }"
								:style="pulseStyle"
								v-tooltip="'Grabar mensaje de voz'"
							>
								<v-icon size="20">{{
									isRecording ? 'mdi-microphone' : 'mdi-microphone-outline'
								}}</v-icon>
							</v-btn>

							<v-btn
								icon
								color="secondary"
								variant="text"
								@click=";(showTextInput = false), (messageText = '')"
								:disabled="isProcessing"
								size="small"
								v-tooltip="'Ocultar teclado'"
							>
								<v-icon size="18">mdi-close</v-icon>
							</v-btn>
						</div>
					</v-card-text>
				</v-card>
			</v-container>
		</div>
	</div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useVoiceChatSimple } from '../composables/useVoiceChat.js'

// Usar el composable simplificado
const {
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
	speak,
	stopSpeech,
	startRecording,
	stopRecording,
	sendTextMessage,
	toggleTextInput,
	hideTextInput,
	cleanup
} = useVoiceChatSimple()

onUnmounted(() => {
	cleanup()
})
</script>

<style scoped>
/* Layout principal */
.voice-app-layout {
	height: calc(100vh - 64px);
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.chat-header {
	flex-shrink: 0;
	background: rgb(var(--v-theme-surface));
	border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}

.chat-messages-area {
	flex: 1;
	overflow-y: auto;
	overflow-x: hidden;
	padding-bottom: 80px;
	background: rgb(var(--v-theme-background));
}

.input-area-fixed {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	z-index: 100;
	min-height: 60px;
}

/* Lista de mensajes */
.messages-list {
	max-width: 1000px;
	margin: 0 auto;
	margin-bottom: 2rem;
}

/* Estado vacío */
.empty-state {
	min-height: 40vh;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
}

/* Burbujas de mensajes */
.message-bubble {
	max-width: 85%;
	border-radius: 18px !important;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	transition: transform 0.2s ease;
}

.message-bubble:hover {
	transform: translateY(-1px);
}

.bot-message {
	margin-left: 0 !important;
	margin-right: auto !important;
}

.user-message {
	margin-left: auto !important;
	margin-right: 0 !important;
}

.recording-btn {
	transition: all 0.2s ease-in-out;
	position: relative;
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
	z-index: -1;
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

/* Status de grabación */
.recording-status {
	font-weight: bold;
}

.chat-messages-area::-webkit-scrollbar {
	width: 4px;
}

.chat-messages-area::-webkit-scrollbar-track {
	background: transparent;
}

.chat-messages-area::-webkit-scrollbar-thumb {
	background: rgba(var(--v-theme-on-surface), 0.2);
	border-radius: 4px;
}

.chat-messages-area::-webkit-scrollbar-thumb:hover {
	background: rgba(var(--v-theme-on-surface), 0.3);
}
</style>
