<script setup lang="ts">
import ToggleTheme from './components/ToggleTheme.vue'
import VoiceApp from './components/VoiceApp.vue'
</script>

<template>
	<v-app>
		<v-app-bar color="surface" elevation="2">
			<div class="d-flex align-center ml-2">
				<v-icon
					icon="mdi-robot"
					size="32"
					class="mr-3 text-primary"
					aria-label="Voice Bot logo"
				></v-icon>
				<span class="text-h5 font-weight-bold">Voice Bot App</span>
			</div>

			<v-spacer></v-spacer>

			<ToggleTheme />
		</v-app-bar>

		<v-main>
			<VoiceApp />
		</v-main>
	</v-app>
</template>
