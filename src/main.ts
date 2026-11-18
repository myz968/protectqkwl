/**
 * 入口
 * 只做三件事：挂 Pinia、挂 App、引入全局样式。
 */

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
