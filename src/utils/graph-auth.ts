// Graph 模块的认证工具函数

// Token 操作
export const setGraphToken = (token: string) => {
  localStorage.setItem('graph_token', token)
  localStorage.setItem('GRAPH_ACCESS_TOKEN', token)
}

export const getGraphToken = () => {
  return localStorage.getItem('graph_token') || localStorage.getItem('GRAPH_ACCESS_TOKEN')
}

export const removeGraphToken = () => {
  localStorage.removeItem('graph_token')
  localStorage.removeItem('GRAPH_ACCESS_TOKEN')
}

// 用户信息操作
export const setGraphUser = (user: any) => {
  localStorage.setItem('graph_user', JSON.stringify(user))
}

export const getGraphUser = () => {
  const user = localStorage.getItem('graph_user')
  return user ? JSON.parse(user) : null
}

export const removeGraphUser = () => {
  localStorage.removeItem('graph_user')
}

// 游客模式操作
export const setGraphVisitorMode = (isVisitor: boolean) => {
  localStorage.setItem('graph_visitor_mode', String(isVisitor))
}

export const isGraphVisitorMode = () => {
  return localStorage.getItem('graph_visitor_mode') === 'true'
}

export const removeGraphVisitorMode = () => {
  localStorage.removeItem('graph_visitor_mode')
}

// 清除所有 Graph 相关数据
export const clearGraphAuth = () => {
  removeGraphToken()
  removeGraphUser()
  removeGraphVisitorMode()
}