<script setup lang="ts">
import { useTheme } from 'vuetify'
import { computed, onMounted } from 'vue'

const theme = useTheme()

// Determine which icon to display based on current theme
const themeIcon = computed(() =>
	theme.global.current.value.dark ? 'mdi-weather-sunny' : 'mdi-weather-night'
)

// Function to toggle theme and save preference to localStorage
function toggleTheme() {
	theme.toggle()
	localStorage.setItem(
		'theme-preference',
		theme.global.current.value.dark ? 'dark' : 'light'
	)
}

// Load theme preference on mount
onMounted(() => {
	const savedTheme = localStorage.getItem('theme-preference')
	if (savedTheme === 'dark') {
		theme.change('dark')
	} else if (savedTheme === 'light') {
		theme.change('light')
	}
})
</script>

<template>
	<!-- Toggle between Light / Dark using icons -->
	<v-btn @click="toggleTheme" icon>
		<v-icon>{{ themeIcon }}</v-icon>
	</v-btn>
</template>
