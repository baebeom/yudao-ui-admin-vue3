import request from '@/config/axios'

export interface ConversationVO {
  id: number
  userId: number
  title: string
  pinned: boolean
  pinnedTime?: string
  createTime: string
  updateTime?: string
}

export interface MessageVO {
  id: number
  conversationId: number
  userId: number
  type: 'user' | 'system'
  content: string
  graph?: string | object
  createTime: string
  updateTime?: string
}

export interface ConversationPageReqVO {
  pageNo: number
  pageSize: number
  userId?: number
  title?: string
  createTimeBegin?: string
  createTimeEnd?: string
  pinned?: boolean
}

export const getConversationPage = (params: ConversationPageReqVO): Promise<{ list: ConversationVO[]; total: number }> => {
  return request.get({
    url: '/graph/chat/conversation/page',
    params
  })
}

export const getMessageListByConversationId = (conversationId: number): Promise<MessageVO[]> => {
  return request.get({
    url: '/graph/chat/message/list-by-conversation-id',
    params: { conversationId }
  })
}

export const deleteConversationByAdmin = (id: number): Promise<boolean> => {
  return request.delete({
    url: '/graph/chat/conversation/delete-by-admin',
    params: { id }
  })
}