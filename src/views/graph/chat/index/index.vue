<template>
  <el-container class="absolute flex-1 top-0 left-0 h-full w-full">
    <!-- 左侧：对话列表 -->
    <ConversationList
      :active-id="activeConversationId?.toString() || ''"
      @on-conversation-create="handleConversationCreateSuccess"
      @on-conversation-click="handleConversationClick"
      @on-conversation-clear="handleConversationClear"
      @on-conversation-delete="handlerConversationDelete"
    />
    <!-- 右侧：对话详情 -->
    <el-container class="bg-[var(--el-bg-color)]">
      <el-header
        class="flex flex-row items-center justify-between bg-[var(--el-bg-color-page)] shadow-[0_0_0_0_var(--el-border-color-light)]"
      >
        <div class="text-18px font-bold">
          {{ activeConversation?.title ? activeConversation?.title : '对话' }}
          <span v-if="activeMessageList.length">({{ activeMessageList.length }})</span>
        </div>
        <div class="flex w-300px flex-row justify-end" v-if="activeConversation">
          <el-button type="primary" bg plain size="small" @click="openChatConversationUpdateForm">
            <span v-html="(activeConversation as any)?.modelName || '默认模型'"></span>
            <Icon icon="ep:setting" class="ml-10px" />
          </el-button>
          <el-button size="small" class="p-10px" @click="handlerMessageClear">
            <Icon
              icon="heroicons-outline:archive-box-x-mark"
              color="var(--el-text-color-placeholder)"
            />
          </el-button>
          <el-button size="small" class="p-10px">
            <Icon icon="ep:download" color="var(--el-text-color-placeholder)" />
          </el-button>
          <el-button size="small" class="p-10px" @click="handleGoTopMessage">
            <Icon icon="ep:top" color="var(--el-text-color-placeholder)" />
          </el-button>
        </div>
      </el-header>

      <!-- main：消息列表 -->
      <el-main class="m-0 p-0 relative h-full w-full">
        <div>
          <div class="absolute top-0 bottom-0 left-0 right-0 overflow-y-hidden p-0 m-0">
            <MessageLoading v-if="activeMessageListLoading" />
            <MessageNewConversation
              v-if="!activeConversation"
              @on-new-conversation="handleConversationCreate"
            />
            <MessageListEmpty
              v-if="!activeMessageListLoading && messageList.length === 0 && activeConversation"
              @on-prompt="doSendMessage"
            />
            <MessageList
              v-if="!activeMessageListLoading && messageList.length > 0 && activeConversation"
              ref="messageRef"
              :conversation="activeConversation"
              :list="messageList"
              @on-delete-success="handleMessageDelete"
              @on-edit="handleMessageEdit"
            />
          </div>
        </div>
      </el-main>

      <!-- 底部 -->
      <el-footer class="flex flex-col !h-auto !p-0">
        <form
          class="mt-10px mx-20px mb-20px py-9px px-10px flex flex-col h-auto rounded-10px"
          style="border: 1px solid var(--el-border-color)"
        >
          <textarea
            class="h-80px border-none box-border resize-none py-0 px-2px overflow-auto focus:outline-none"
            v-model="prompt"
            @keydown="handleSendByKeydown"
            @input="handlePromptInput"
            @compositionstart="onCompositionstart"
            @compositionend="onCompositionend"
            placeholder="问我任何问题...（Shift+Enter 换行，按下 Enter 发送）"
          >
          </textarea>
          <div class="flex justify-between pb-0 pt-5px">
            <div class="flex items-center">
              <MessageFileUpload v-model="uploadFiles" :limit="5" :max-size="10" class="mr-10px" />
              <el-switch v-model="enableContext" />
              <span class="ml-5px mr-15px text-14px text-#8f8f8f">上下文</span>
              <el-switch v-model="enableWebSearch" />
              <span class="ml-5px text-14px text-#8f8f8f">联网搜索</span>
            </div>
            <el-button
              type="primary"
              size="default"
              @click="handleSendByButton"
              :loading="conversationInProgress"
              v-if="conversationInProgress == false"
            >
              发送
            </el-button>
            <el-button
              type="danger"
              size="default"
              @click="stopGeneration"
              v-if="conversationInProgress == true"
            >
              停止
            </el-button>
          </div>
        </form>
      </el-footer>
    </el-container>

    <!-- 更新对话 Form -->
    <ConversationUpdateForm
      ref="conversationUpdateFormRef"
      @success="handleConversationUpdateSuccess"
    />
  </el-container>
</template>

<script setup lang="ts">
import { ChatMessageApi, ChatMessageVO } from '@/api/graph/chat/message'
import { ChatConversationApi, ChatConversationVO } from '@/api/graph/chat/conversation'
import ConversationList from './components/conversation/ConversationList.vue'
import ConversationUpdateForm from './components/conversation/ConversationUpdateForm.vue'
import MessageList from './components/message/MessageList.vue'
import MessageListEmpty from './components/message/MessageListEmpty.vue'
import MessageLoading from './components/message/MessageLoading.vue'
import MessageNewConversation from './components/message/MessageNewConversation.vue'
import MessageFileUpload from './components/message/MessageFileUpload.vue'
import { ElMessage, ElMessageBox } from 'element-plus'

/** AI 聊天对话 列表 */
defineOptions({ name: 'AiChat' })

const route = useRoute()

// 聊天对话
const activeConversationId = ref<number | null>(null)
const activeConversation = ref<ChatConversationVO | null>(null)
const conversationInProgress = ref(false)
const abortController = ref<AbortController | null>(null)

// 消息列表
const messageRef = ref()
const activeMessageList = ref<ChatMessageVO[]>([])
const activeMessageListLoading = ref<boolean>(false)
const activeMessageListLoadingTimer = ref<any>()

// 发送消息输入框
const isComposing = ref(false)
const inputTimeout = ref<any>()
const prompt = ref<string>()
const enableContext = ref<boolean>(true)
const enableWebSearch = ref<boolean>(false)
const uploadFiles = ref<string[]>([])

// =========== 本地缓存函数 ===========
/** 保存对话消息到 localStorage */
const saveConversationMessages = (conversationId: number, messages: ChatMessageVO[]) => {
  if (!conversationId) return
  const key = `chat_messages_${conversationId}`
  localStorage.setItem(key, JSON.stringify(messages))
}

/** 删除对话的缓存 */
const removeConversationMessages = (conversationId: number) => {
  if (!conversationId) return
  const key = `chat_messages_${conversationId}`
  localStorage.removeItem(key)
}

// =========== 【聊天对话】相关 ===========

/** 获取对话信息 */
const getConversation = async (id: number | null) => {
  if (!id || typeof id !== 'number') return
  try {
    console.log("📡 获取对话详情，ID:", id)
    const res = await ChatConversationApi.getChatConversationMy(id)
    console.log("📡 获取对话详情返回:", res)
  
    const resData = res as any
    
    let conversation: any = null
    if (resData && resData.code === 0 && resData.data) {
      conversation = resData.data
    } else if (resData && resData.id) {
      conversation = resData
    }

    if (!conversation) {
      console.warn("⚠️ 未获取到对话详情")
      return
    }
    
    activeConversation.value = conversation
    activeConversationId.value = conversation.id
  } catch (error) {
    console.error('获取对话信息失败:', error)
  }
}

/**
 * 点击某个对话
 */
const handleConversationClick = async (conversation: ChatConversationVO) => {
  if (conversationInProgress.value) {
    ElMessage.warning('回答中，不允许切换!')
    return false
  }

  if (activeConversationId.value === conversation.id) {
    return true
  }

  // 保存当前对话的消息到缓存（切换前保存）
  if (activeConversationId.value !== null && activeMessageList.value.length > 0) {
    saveConversationMessages(activeConversationId.value, activeMessageList.value)
  }

  activeConversationId.value = conversation.id
  activeConversation.value = conversation
  
  // 清空当前消息列表
  activeMessageList.value = []
  
  // 重新加载新对话的消息列表
  await getMessageList()
  
  await nextTick()
  scrollToBottom(true)
  
  prompt.value = ''
  uploadFiles.value = []
  
  return true
}

/** 删除某个对话*/
const handlerConversationDelete = async (delConversation: ChatConversationVO) => {
  if (activeConversationId.value === delConversation.id) {
    // 删除缓存
    removeConversationMessages(delConversation.id)
    await handleConversationClear()
  }
}

/** 清空选中的对话 */
const handleConversationClear = async () => {
  if (conversationInProgress.value) {
    ElMessage.warning('对话中，不允许切换!')
    return false
  }
  // 清除当前对话的缓存
  if (activeConversationId.value !== null) {
    removeConversationMessages(activeConversationId.value)
  }
  activeConversationId.value = null
  activeConversation.value = null
  activeMessageList.value = []
}

/** 修改聊天对话 */
const conversationUpdateFormRef = ref()
const openChatConversationUpdateForm = async () => {
  conversationUpdateFormRef.value.open(activeConversationId.value)
}
const handleConversationUpdateSuccess = async () => {
  await getConversation(activeConversationId.value)
}

const handleConversationCreate = async () => {
  console.log("✅ 新建对话按钮被点击了！")
  
  try {
    console.log("📡 开始发送请求...")
    const res = await ChatConversationApi.createChatConversationMy({ title: '新对话' })
    console.log("📡 创建对话 API 完整返回:", res)

    const resData = res as any

    let newConversationId: number | null = null
    if (typeof resData === 'number') {
      newConversationId = resData
    } else if (resData && typeof resData === 'object') {
      if (resData.code === 0 && resData.data && typeof resData.data === 'number') {
        newConversationId = resData.data
      } else if (resData.data && typeof resData.data === 'number') {
        newConversationId = resData.data
      }
    }

    if (!newConversationId || isNaN(newConversationId)) {
      ElMessage.error(`创建失败：返回格式异常，响应内容：${JSON.stringify(resData)}`)
      return
    }

    console.log("✅ 新对话 ID:", newConversationId)
    await getConversation(newConversationId)
    ElMessage.success("创建对话成功")
  } catch (error: any) {
    console.error("❌ 创建对话完整错误:", error)
    ElMessage.error(`创建失败：${error.message || '网络错误'}`)
  }
}

const handleConversationCreateSuccess = async (newConversation?: ChatConversationVO) => {
  prompt.value = ''
  uploadFiles.value = []
  
  // 如果有新创建的对话，自动切换到该对话
  if (newConversation) {
    await handleConversationClick(newConversation)
  }
}

// =========== 【消息列表】相关 ===========

const getMessageList = async () => {
  try {
    if (activeConversationId.value === null) {
      activeMessageList.value = []
      return
    }
    
    activeMessageListLoadingTimer.value = setTimeout(() => {
      activeMessageListLoading.value = true
    }, 60)

    // 修复点2：API 返回的是 AxiosResponse，需要先取 data
    const res = await ChatMessageApi.getChatMessageListByConversationId(
      activeConversationId.value
    )
    const messages = res.data || []
    
    // 转换后端返回的消息，将 graph 字段解析为 relationList
    const convertedMessages = messages.map((msg: any) => {
      // 如果有 graph 字段且没有 relationList，解析它
      if (msg.graph && !msg.relationList) {
        try {
          msg.relationList = JSON.parse(msg.graph)
        } catch (e) {
          msg.relationList = []
        }
      }
      return msg
    })
    
    activeMessageList.value = convertedMessages

    await nextTick()
    await scrollToBottom()
  } catch (error) {
    console.error('获取消息列表失败:', error)
    activeMessageList.value = []
  } finally {
    if (activeMessageListLoadingTimer.value) {
      clearTimeout(activeMessageListLoadingTimer.value)
    }
    activeMessageListLoading.value = false
  }
}

/**
 * 消息列表
 */
const messageList = computed(() => {
  if (activeMessageList.value.length > 0) {
    return activeMessageList.value
  }
  if ((activeConversation.value as any)?.systemMessage) {
    return [
      {
        id: 0,
        conversationId: activeConversation.value?.id || 0,
        type: 'system',
        userId: 0,
        content: (activeConversation.value as any).systemMessage,
        useContext: false,
        deleted: false,
        createTime: new Date(),
        attachmentUrls: [],
        reasoningContent: '',
        segments: [],
        webSearchPages: [],
        relationList: []
      } as ChatMessageVO
    ]
  }
  return []
})

/** 处理删除 message 消息 */
const handleMessageDelete = () => {
  if (conversationInProgress.value) {
    ElMessage.warning('回答中，不能删除!')
    return
  }
  getMessageList()
}

/** 处理 message 清空 */
const handlerMessageClear = async () => {
  if (!activeConversationId.value) return
  try {
    await ElMessageBox.confirm('确认清空对话消息？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await ChatMessageApi.deleteByConversationId(activeConversationId.value)
    activeMessageList.value = []
    // 清空缓存
    removeConversationMessages(activeConversationId.value)
    ElMessage.success('清空成功')
  } catch {
    // 用户取消
  }
}

/** 回到 message 列表的顶部 */
const handleGoTopMessage = () => {
  messageRef.value?.handlerGoTop()
}

// =========== 【发送消息】相关 ===========

/** 处理来自 keydown 的发送消息 */
const handleSendByKeydown = async (event: KeyboardEvent) => {
  if (isComposing.value) return
  if (conversationInProgress.value) return
  
  const content = prompt.value?.trim() as string
  if (event.key === 'Enter') {
    if (event.shiftKey) {
      prompt.value += '\r\n'
      event.preventDefault()
    } else {
      await doSendMessage(content)
      event.preventDefault()
    }
  }
}

/** 处理来自【发送】按钮的发送消息 */
const handleSendByButton = () => {
  doSendMessage(prompt.value?.trim() as string)
}

/** 处理 prompt 输入变化 */
const handlePromptInput = (event: InputEvent) => {
  if (!isComposing.value) {
    if ((event as any).data == null) return
    isComposing.value = true
  }
  if (inputTimeout.value) clearTimeout(inputTimeout.value)
  inputTimeout.value = setTimeout(() => {
    isComposing.value = false
  }, 400)
}

const onCompositionstart = () => {
  isComposing.value = true
}
const onCompositionend = () => {
  setTimeout(() => {
    isComposing.value = false
  }, 200)
}

/** 从用户问题中提取实体名称 */
const extractEntityName = (content: string): string | null => {
  const patterns = [
    /^(.+?)的/,
    /^(.+?)是/,
    /^(.+?)介绍/,
    /^(.+?)适合/,
    /^(.+?)属于/,
    /^(.+?)的?知识图谱/,
    /^(.+?)的关系/
  ]
  
  for (const pattern of patterns) {
    const match = content.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  
  if (content.length > 0) {
    return content.substring(0, Math.min(12, content.length))
  }
  
  return null
}

/** 发送消息到后端接口（核心：仅调用后端接口，不再直接调用8000的QA接口） */
const doSendMessageToBackend = async (question: string, attachmentUrls: string[] = []) => {
  console.log('【发送消息】开始执行，question:', question)
  
  if (!activeConversationId.value) {
    ElMessage.error('请先创建对话')
    return
  }

  abortController.value = new AbortController()
  conversationInProgress.value = true
  
  // 先清空输入框
  prompt.value = ''
  uploadFiles.value = []

  try {
    // 1. 先调用后端接口获取消息列表（确保拿到最新数据）
    await getMessageList()

    // 2. 调用后端流式发送接口（核心：让后端处理AI并保存消息到数据库）
    console.log('【发送消息】准备调用后端流式接口')
    let fullAnswer = ''

    await ChatMessageApi.sendChatMessageStream(
      activeConversationId.value,
      question,
      abortController.value,
      enableContext.value,
      enableWebSearch.value,
      (event: any) => {
        // 流式接收内容
        fullAnswer += event.data
        console.log('【流式消息】收到片段:', event.data)
      },
      (error: any) => {
        console.error('【流式消息】错误:', error)
        ElMessage.error('消息发送失败：' + (error.message || '未知错误'))
      },
      () => {
        console.log('【流式消息】接收完成，完整内容:', fullAnswer)
      },
      attachmentUrls
    )

    // 3. 流式结束后，重新从后端获取消息列表（确保显示数据库里的真实数据）
    console.log('【发送消息】重新加载消息列表')
    await getMessageList()
    await nextTick()
    await scrollToBottom()
    
  } catch (err: any) {
    console.error('【发送消息】完整错误:', err)
    if (err.name !== 'AbortError') {
      ElMessage.error('请求失败: ' + (err.message || '网络错误'))
    }
  } finally {
    conversationInProgress.value = false
    abortController.value = null
  }
}

/** 真正执行【发送】消息操作 */
const doSendMessage = async (content: string) => {
  if (content.length < 1) {
    ElMessage.error('发送失败，原因：内容为空！')
    return
  }
  if (activeConversationId.value == null) {
    ElMessage.error('还没创建对话，不能发送!')
    return
  }

  const attachmentUrls = [...uploadFiles.value]
  
  // 调用后端接口发送消息（不再直接调用8000的QA接口）
  await doSendMessageToBackend(content, attachmentUrls)
}

/** 停止生成 */
const stopGeneration = () => {
  if (abortController.value) {
    abortController.value.abort()
    ElMessage.info('已停止生成')
  }
  conversationInProgress.value = false
}

/** 编辑 message：设置为 prompt，可以再次编辑 */
const handleMessageEdit = (message: ChatMessageVO) => {
  prompt.value = message.content
}

// ============== 【消息滚动】相关 =============

/** 滚动到 message 底部 */
const scrollToBottom = async (isIgnore?: boolean) => {
  await nextTick()
  if (messageRef.value) {
    messageRef.value.scrollToBottom(isIgnore)
  }
}

/** 回到顶部 */
const handlerGoTop = () => {
  messageRef.value?.handlerGoTop()
}

/** 初始化 **/
onMounted(async () => {
  if (route.query.conversationId) {
    const id = Number(route.query.conversationId)
    if (!isNaN(id)) {
      activeConversationId.value = id
      await getConversation(id)
    }
  }

  activeMessageListLoading.value = true
  await getMessageList()
})

defineExpose({ scrollToBottom, handlerGoTop })
</script>