import { fetchEventSource, EventSourceMessage } from '@microsoft/fetch-event-source'
import graphRequest from '@/utils/graphRequest'
import { getGraphToken } from '@/utils/graph-auth'

// 聊天 VO - 严格匹配 graph_chat_message 表结构
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

  // 前端扩展字段
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

// QA 接口返回类型
export interface QAResponse {
  code: number
  msg?: string
  data?: {
    answer?: string[]
    list?: Array<{
      entity1: string
      entity2: string
      rel: string
      entity1_type?: string
      entity2_type?: string
    }>
  }
}

// graph chat 聊天 API
export const ChatMessageApi = {
  getChatMessageListByConversationId: async (conversationId: number | null) => {
    return await graphRequest.get(`/graph/chat/message/list-by-conversation-id?conversationId=${conversationId}`)
  },

  saveMessage: async (message: ChatMessageVO) => {
    return await graphRequest.post('/graph/chat/message/save', message)
  },

  updateMessage: async (message: ChatMessageVO) => {
    return await graphRequest.put('/graph/chat/message/update', message)
  },

  sendChatMessage: async (question: string): Promise<QAResponse> => {
    try {
      const response = await graphRequest.get('/api/qa/', {
        params: { question },
        timeout: 30000
      })
      return response.data
    } catch (error) {
      console.error('QA 接口请求失败:', error)
      throw error
    }
  },

  sendChatMessageStream: async (
    conversationId: number,
    content: string,
    ctrl: AbortController,
    enableContext: boolean,
    enableWebSearch: boolean,
    onMessage: (event: EventSourceMessage) => void,
    onError: (error: Error) => void,
    onClose: () => void,
    attachmentUrls?: string[]
  ) => {
    const token = getGraphToken()
    const baseURL = graphRequest.defaults.baseURL || '/admin-api'

    return fetchEventSource(`${baseURL}/graph/chat/message/send-stream`, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      openWhenHidden: true,
      body: JSON.stringify({
        conversationId,
        content,
        useContext: enableContext,
        useSearch: enableWebSearch,
        attachmentUrls: attachmentUrls || []
      }),
      onmessage: onMessage,
      onerror: onError,
      onclose: onClose,
      signal: ctrl.signal
    })
  },

  deleteChatMessage: async (id: number) => {
    return await graphRequest.delete(`/graph/chat/message/delete?id=${id}`)
  },

  deleteByConversationId: async (conversationId: number) => {
    return await graphRequest.delete(`/graph/chat/message/delete-by-conversation-id?conversationId=${conversationId}`)
  },

  getChatMessagePage: async (params: {
    pageNum?: number
    pageSize?: number
    userId?: number
    conversationId?: number
    type?: 'user' | 'system'
  }) => {
    return await graphRequest.get('/graph/chat/message/page', { params })
  },

  deleteChatMessageByAdmin: async (id: number) => {
    return await graphRequest.delete(`/graph/chat/message/delete-by-admin?id=${id}`)
  }
}