const GRAPH_TOKEN_KEY = 'GRAPH_ACCESS_TOKEN'
const GRAPH_USER_KEY = 'GRAPH_USER_INFO'
const GRAPH_VISITOR_KEY = 'GRAPH_VISITOR_MODE'

// 设置 Graph token
export const setGraphToken = (token: string) => {
  localStorage.setItem(GRAPH_TOKEN_KEY, token)
}

// 获取 Graph token
export const getGraphToken = () => {
  return localStorage.getItem(GRAPH_TOKEN_KEY)
}

// 移除 Graph token
export const removeGraphToken = () => {
  localStorage.removeItem(GRAPH_TOKEN_KEY)
  localStorage.removeItem(GRAPH_USER_KEY)
  localStorage.removeItem(GRAPH_VISITOR_KEY)
}

// 设置 Graph 用户信息
export const setGraphUser = (user: any) => {
  localStorage.setItem(GRAPH_USER_KEY, JSON.stringify(user))
}

// 获取 Graph 用户信息
export const getGraphUser = () => {
  const userStr = localStorage.getItem(GRAPH_USER_KEY)
  if (userStr) {
    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  }
  return null
}

// 设置游客模式
export const setGraphVisitorMode = (isVisitor: boolean) => {
  localStorage.setItem(GRAPH_VISITOR_KEY, String(isVisitor))
}

// 是否游客模式
export const isGraphVisitorMode = () => {
  return localStorage.getItem(GRAPH_VISITOR_KEY) === 'true'
}

// 判断是否已登录
export const isGraphLoggedIn = () => {
  return !!getGraphToken()
}