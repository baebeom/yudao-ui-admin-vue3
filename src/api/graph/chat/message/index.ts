import { fetchEventSource, EventSourceMessage } from '@microsoft/fetch-event-source'
import graphRequest from '@/utils/graphRequest'

export interface ChatMessageVO {
  id: number
  conversationId: number
  userId: number
  type: 'user' | 'system'
  content: string
  useContext: boolean
  parsedEntity?: string
  parsedRelation?: string
  cypherQuery?: string
  kgAnswer?: string
  responseTimeMs?: number
  graph?: string
  createTime?: Date | string
  updateTime?: Date | string
  attachmentUrls?: string[]
  reasoningContent?: string
  segments?: any[]
  webSearchPages?: any[]
  relationList?: Array<{
    entity1: string
    entity2: string
    rel: string
  }>
}

export interface QAResponse {
  code: number
  msg?: string
  data?: {
    answer?: string[]
    list?: Array<{
      entity1: string
      entity2: string
      rel: string
    }>
  }
}

// 只使用系统 ACCESS_TOKEN
const getAccessToken = () => localStorage.getItem('ACCESS_TOKEN')?.replace(/"/g, '') || ''

export const ChatMessageApi = {
  getChatMessageListByConversationId: async (conversationId) => {
    return await graphRequest.get(`/graph/chat/message/list-by-conversation-id?conversationId=${conversationId}`)
  },
  saveMessage: async (message) => {
    return await graphRequest.post('/graph/chat/message/save', message)
  },
  updateMessage: async (message) => {
    return await graphRequest.put('/graph/chat/message/update', message)
  },
  sendChatMessage: async (question) => {
    return await graphRequest.get('/api/qa/', { params: { question } })
  },
  sendChatMessageStream: async (
    conversationId, content, ctrl, enableContext, enableWebSearch,
    onMessage, onError, onClose, attachmentUrls = []
  ) => {
    const token = getAccessToken()
    const baseURL = graphRequest.defaults.baseURL || '/admin-api'

    return fetchEventSource(`${baseURL}/graph/chat/message/send-stream`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'token': token
      },
      body: JSON.stringify({
        conversationId, content, useContext: enableContext, useSearch: enableWebSearch, attachmentUrls
      }),
      signal: ctrl.signal,
      onmessage: onMessage,
      onerror: onError,
      onclose: onClose
    })
  },
  deleteChatMessage: async (id) => {
    return await graphRequest.delete(`/graph/chat/message/delete?id=${id}`)
  },
  deleteByConversationId: async (conversationId) => {
    return await graphRequest.delete(`/graph/chat/message/delete-by-conversation-id?conversationId=${conversationId}`)
  },
  getChatMessagePage: async (params) => {
    return await graphRequest.get('/graph/chat/message/page', { params })
  },
  deleteChatMessageByAdmin: async (id) => {
    return await graphRequest.delete(`/graph/chat/message/delete-by-admin?id=${id}`)
  }
}