import { createApp } from 'vue'

import 'vuetify/styles/main.css'
import '@mdi/font/css/materialdesignicons.css' // Importar iconos MDI
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import './style.css'

import App from './App.vue'

const vuetify = createVuetify({
	theme: {
		defaultTheme: 'system' // 'light' | 'dark' | 'system'
	},
	components,
	directives
})

createApp(App).use(vuetify).mount('#app')
