import request from '@/config/axios'
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { getAccessToken } from '@/utils/auth'
import { config } from '@/config/axios/config'

// graph 聊天消息 VO
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

// 知识图谱 Graph Chat 聊天
export const ChatMessageApi = {
  // 获取指定对话的消息列表
  getChatMessageListByConversationId: async (conversationId: number | null) => {
    return await request.get({
      url: `/graph/chat/message/list-by-conversation-id?conversationId=${conversationId}`
    })
  },

  // 发送 Stream 消息 (知识图谱)
  sendChatMessageStream: async (
    conversationId: number,
    content: string,
    ctrl,
    enableContext: boolean,
    enableWebSearch: boolean,
    onMessage,
    onError,
    onClose,
    attachmentUrls?: string[]
  ) => {
    const token = getAccessToken()
    // ✅ 关键点：使用 config.base_url，路径改为 /graph/...
    return fetchEventSource(`${config.base_url}/graph/chat/message/send-stream`, {
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

  // 删除单条消息
  deleteChatMessage: async (id: number) => {
    return await request.delete({ url: `/graph/chat/message/delete?id=${id}` })
  },

  // 删除指定对话的所有消息
  deleteByConversationId: async (conversationId: number) => {
    return await request.delete({
      url: `/graph/chat/message/delete-by-conversation-id?conversationId=${conversationId}`
    })
  },

  // 获得消息分页 (管理后台)
  getChatMessagePage: async (params: any) => {
    return await request.get({ url: '/graph/chat/message/page', params })
  },

  // 管理员删除消息
  deleteChatMessageByAdmin: async (id: number) => {
    return await request.delete({ url: `/graph/chat/message/delete-by-admin?id=${id}` })
  }
}