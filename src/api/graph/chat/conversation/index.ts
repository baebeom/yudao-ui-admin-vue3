import graphRequest from '@/utils/graphRequest'

// graph 聊天对话 VO
export interface ChatConversationVO {
  id: number
  userId: number
  title: string
  pinned: boolean
  pinnedTime?: Date | string
  creator?: string
  createTime?: Date | string
  updater?: string
  updateTime?: Date | string
  deleted: boolean
  tenantId?: number

  systemMessage?: string
  modelName?: string
  modelId?: number
  temperature?: number
  maxTokens?: number
  maxContexts?: number
  roleAvatar?: string
}

// graph 聊天对话 API
export const ChatConversationApi = {
  getChatConversationMy: async (id: number) => {
    return await graphRequest.get(`/graph/chat/conversation/get-my?id=${id}`)
  },

  createChatConversationMy: async (data?: Partial<ChatConversationVO>) => {
    return await graphRequest.post('/graph/chat/conversation/create-my', data)
  },

  updateChatConversationMy: async (data: ChatConversationVO) => {
    return await graphRequest.put('/graph/chat/conversation/update-my', data)
  },

  deleteChatConversationMy: async (id: number) => {
    return await graphRequest.delete(`/graph/chat/conversation/delete-my?id=${id}`)
  },

  deleteChatConversationMyByUnpinned: async () => {
    return await graphRequest.delete('/graph/chat/conversation/delete-by-unpinned')
  },

  getChatConversationMyList: async () => {
    return await graphRequest.get('/graph/chat/conversation/my-list')
  },

  getChatConversationPage: async (params: {
    pageNum?: number
    pageSize?: number
    userId?: number
    pinned?: boolean
    tenantId?: number
    deleted?: boolean
  }) => {
    return await graphRequest.get('/graph/chat/conversation/page', { params })
  },

  deleteChatConversationByAdmin: async (id: number) => {
    return await graphRequest.delete(`/graph/chat/conversation/delete-by-admin?id=${id}`)
  }
}