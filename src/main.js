import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import '@fortawesome/fontawesome-free/css/all.min.css'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import store from './store'

function bootstrapApp() {
  const app = createApp(App)
  app.use(router)
  app.use(ElementPlus)
  app.use(store)
  app.mount('#app')
}

const CLIENT_ID = '1002'
try {
  const accessToken = localStorage.getItem('accessToken' + CLIENT_ID)
  const rawUser = localStorage.getItem('user' + CLIENT_ID)
  if (accessToken && rawUser) {
    store.commit('setAuthenticated', true)
    store.commit('setUser', JSON.parse(rawUser))
  }
} catch (e) {
  // Ignore localStorage errors
}
bootstrapApp()
