import axios from 'axios'
import store from '@/store'
// SSO header style: send accessToken via header name `${TOKEN_NAME_PREFIX}${CLIENT_ID}`
// Keep in sync with smart-sso server client settings
const CLIENT_ID = '1002'
const TOKEN_NAME_PREFIX = 'smart-sso-token-'

const client = axios.create({
  baseURL: store.state.serverAddr
})

client.interceptors.request.use(config => {
  const accessToken = localStorage.getItem('accessToken' + CLIENT_ID)
  if (!config.headers) config.headers = {}
  if (accessToken) {
    config.headers[TOKEN_NAME_PREFIX + CLIENT_ID] = accessToken
  }
  config.headers['X-Requested-With'] = 'XMLHttpRequest'
  return config
})

store.watch(
  (state) => state.serverAddr,
  (newAddr) => {
    client.defaults.baseURL = newAddr
  }
)

export default client
