import axios from 'axios'
import { getGraphToken } from './graph-auth'

const graphRequest = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL || '/admin-api',
  timeout: 30000
})

// 请求拦截器
graphRequest.interceptors.request.use(
  (config) => {
    const token = getGraphToken()
    if (token) {
      (config.headers as any)['token'] = token
    }
    (config.headers as any)['tenant-id'] = '1'
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
graphRequest.interceptors.response.use(
  (response) => response.data,
  (error) => Promise.reject(error)
)

export default graphRequest