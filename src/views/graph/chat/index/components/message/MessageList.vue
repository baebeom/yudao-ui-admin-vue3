<template>
  <div ref="messageContainer" class="h-100% overflow-y-auto relative">
    <div class="flex flex-col overflow-y-hidden px-20px" v-for="(item, index) in list" :key="index">
      <!-- 靠左 message：system、assistant 类型 -->
      <div class="flex flex-row mt-50px" v-if="item.type !== 'user'">
        <div class="avatar">
          <el-avatar :size="32" :src="roleAvatar" class="ai-avatar" />
        </div>
        <div class="flex flex-col text-left mx-15px flex-1 min-w-0">
          <div>
            <el-text class="text-left leading-30px">{{ formatDate(item.createTime || new Date()) }}</el-text>
          </div>
          <div
            class="relative flex flex-col break-words bg-[var(--el-fill-color-light)] shadow-[0_0_0_1px_var(--el-border-color-light)] rounded-10px pt-10px px-10px pb-5px"
          >
            <MessageReasoning
              :reasoning-content="item.reasoningContent || ''"
              :content="item.content || ''"
            />
            <MarkdownView
              class="text-[var(--el-text-color-primary)] text-[0.95rem]"
              :content="item.content"
            />
            <MessageFiles :attachment-urls="item.attachmentUrls" />
            <MessageKnowledge v-if="item.segments" :segments="item.segments" />
            <MessageWebSearch v-if="item.webSearchPages" :web-search-pages="item.webSearchPages" />
            
            <!-- 知识图谱区域 - 参考 Right.vue 的实现 -->
            <div v-if="item.relationList && item.relationList.length > 0" class="mt-10px">
              <div 
                class="flex items-center justify-between cursor-pointer p-8px rounded-8px bg-gradient-to-r from-green-50 to-teal-50 border border-gray-200/60 hover:from-green-100 hover:to-teal-100 transition-all duration-200"
                @click="toggleGraphVisibility(item.id)"
              >
                <div class="flex items-center gap-6px text-14px font-medium text-gray-700">
                  <el-icon :size="16" class="text-green-600">
                    <Share />
                  </el-icon>
                  <span>知识图谱</span>
                  <span class="text-12px text-gray-500">（{{ item.relationList.length }} 个关系）</span>
                </div>
                <el-icon
                  :size="14"
                  class="text-gray-500 transition-transform duration-200"
                  :class="{ 'transform rotate-180': graphVisibleMap[item.id] }"
                >
                  <ArrowDown />
                </el-icon>
              </div>
              
              <!-- 知识图谱内容 - 参考 Right.vue，使用 v-show 让容器始终存在 -->
              <div
                v-show="graphVisibleMap[item.id]"
                class="mt-8px p-8px bg-white/70 backdrop-blur-sm border border-gray-200/60 rounded-8px shadow-sm"
              >
                <div :ref="(el) => setGraphContainer(el, item.id)" class="graph-container" style="height: 400px; width: 100%;"></div>
              </div>
            </div>
          </div>
          <!-- AI 回答的按钮组 -->
          <div class="flex flex-row mt-8px">
            <el-button
              class="flex bg-transparent items-center hover:cursor-pointer hover:bg-[var(--el-fill-color-lighter)]"
              link
              @click="copyContent(item.content)"
            >
              <img class="h-20px" src="@/assets/ai/copy.svg" />
            </el-button>
            <el-button
              v-if="item.id > 0"
              class="flex bg-transparent items-center hover:cursor-pointer hover:bg-[var(--el-fill-color-lighter)]"
              link
              @click="onDelete(item.id)"
            >
              <img class="h-17px" src="@/assets/ai/delete.svg" />
            </el-button>
          </div>
        </div>
      </div>
      
      <!-- 靠右 message：user 类型 -->
<div class="flex flex-row-reverse justify-start mt-50px" v-if="item.type === 'user'">
  <div class="avatar">
    <el-avatar :src="userAvatar" />
  </div>
  <div class="flex flex-col text-left mx-15px">
    <div>
      <el-text class="text-left leading-30px">{{ formatDate(item.createTime || new Date()) }}</el-text>
    </div>
    <!-- 附件显示行 -->
    <div
      v-if="item.attachmentUrls && item.attachmentUrls.length > 0"
      class="flex flex-row-reverse mb-8px"
    >
      <MessageFiles :attachment-urls="item.attachmentUrls" />
    </div>
    <!-- 文本内容行 -->
    <div class="flex flex-row-reverse">
      <div
        v-if="item.content && item.content.trim()"
        class="text-[0.95rem] text-[var(--el-color-white)] inline bg-[var(--el-color-primary)] shadow-[0_0_0_1px_var(--el-color-primary)] rounded-10px p-10px w-auto break-words whitespace-pre-wrap"
      >
        {{ item.content }}
      </div>
    </div>
    <!-- 用户消息的按钮组 -->
    <div class="flex flex-row-reverse mt-8px">
      <el-button
        class="flex bg-transparent items-center hover:cursor-pointer hover:bg-[var(--el-fill-color-lighter)]"
        link
        @click="copyContent(item.content)"
      >
        <img class="h-20px" src="@/assets/ai/copy.svg" />
      </el-button>
      <el-button
        class="flex bg-transparent items-center hover:cursor-pointer hover:bg-[var(--el-fill-color-lighter)]"
        link
        @click="onDelete(item.id)"
      >
        <img class="h-17px mr-12px" src="@/assets/ai/delete.svg" />
      </el-button>
      <el-button
        class="flex bg-transparent items-center hover:cursor-pointer hover:bg-[var(--el-fill-color-lighter)]"
        link
        @click="onEdit(item)"
      >
        <el-icon size="17"><Edit /></el-icon>
      </el-button>
    </div>
  </div>
</div>
    </div>
  </div>
  <!-- 回到底部 -->
  <div v-if="isScrolling" class="absolute z-1000 bottom-0 right-50%" @click="handleGoBottom">
    <el-button :icon="ArrowDownBold" circle />
  </div>
</template>

<script setup lang="ts">
import { PropType, ref, toRefs, watch, nextTick, onMounted, onUnmounted, computed } from 'vue'
import { formatDate } from '@/utils/formatTime'
import MarkdownView from '@/components/MarkdownView/index.vue'
import MessageKnowledge from './MessageKnowledge.vue'
import MessageReasoning from './MessageReasoning.vue'
import MessageFiles from './MessageFiles.vue'
import MessageWebSearch from './MessageWebSearch.vue'
import { useClipboard } from '@vueuse/core'
import { ArrowDownBold, Edit, Share, ArrowDown } from '@element-plus/icons-vue'
import { ChatMessageApi, ChatMessageVO } from '@/api/graph/chat/message'
import { ChatConversationVO } from '@/api/graph/chat/conversation'
import { useUserStore } from '@/store/modules/user'
import * as echarts from 'echarts'
// import roleAvatarDefaultImg from '@/assets/ai/gpt.svg'
import aiRobotIcon from '@/assets/ai/ai-robot.svg'
import { ElMessage } from 'element-plus'

const message = ElMessage
const { copy } = useClipboard({ legacy: true })
const userStore = useUserStore()

// 滚动相关
const messageContainer = ref<HTMLElement | null>(null)
const isScrolling = ref(false)

// 图表实例和可见性状态
const chartInstances = ref<Map<number, any>>(new Map())
const graphVisibleMap = ref<Record<number, boolean>>({})

// 用户头像
const userAvatar = computed(() => {
  const avatar = userStore.user?.avatar
  if (avatar && avatar !== '') {
    return avatar
  }
  const nickname = userStore.user?.nickname || '用户'
  return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${nickname}&backgroundType=gradientLinear&backgroundColor=b6e3f4&radius=50`
})

// const roleAvatar = computed(() => props.conversation.roleAvatar ?? roleAvatarDefaultImg)
const roleAvatar = computed(() => aiRobotIcon)

const props = defineProps({
  conversation: {
    type: Object as PropType<ChatConversationVO>,
    required: true
  },
  list: {
    type: Array as PropType<ChatMessageVO[]>,
    required: true
  }
})

const { list } = toRefs(props)
const emits = defineEmits(['onDeleteSuccess', 'onEdit'])

// 关系数据类型定义
interface RelationItem {
  entity1: string
  entity2: string
  rel: string
}

// 构建图谱数据 - 参考 Right.vue
const buildGraphData = (relationList: RelationItem[]) => {
  const nodes: any[] = []
  const links: any[] = []
  const nodeSet = new Set()
  
  for (const item of relationList) {
    if (!item.entity1 || !item.entity2) continue
    
    if (!nodeSet.has(item.entity1)) {
      nodeSet.add(item.entity1)
      nodes.push({
        id: item.entity1,
        name: item.entity1,
        symbolSize: Math.min(70, Math.max(45, item.entity1.length * 3))
      })
    }
    
    if (!nodeSet.has(item.entity2)) {
      nodeSet.add(item.entity2)
      nodes.push({
        id: item.entity2,
        name: item.entity2,
        symbolSize: Math.min(70, Math.max(45, item.entity2.length * 3))
      })
    }
    
    links.push({
      source: item.entity1,
      target: item.entity2,
      label: item.rel
    })
  }
  
  return { nodes, links }
}

// 渲染知识图谱 - 参考 Right.vue 的 renderGraph 函数
const renderGraph = (container: HTMLElement, relationList: RelationItem[], messageId: number) => {
  if (!container || !relationList || relationList.length === 0) {
    console.warn('renderGraph: 容器或关系数据为空', messageId)
    return
  }

  // 清空容器内容
  container.innerHTML = ''
  
  // 销毁旧实例
  if (chartInstances.value.get(messageId)) {
    chartInstances.value.get(messageId).dispose()
    chartInstances.value.delete(messageId)
  }

  // 使用 setTimeout 确保 DOM 已渲染
  setTimeout(() => {
    if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
      setTimeout(() => renderGraph(container, relationList, messageId), 200)
      return
    }

    const { nodes, links } = buildGraphData(relationList)
    if (nodes.length === 0) return

    const chart = echarts.init(container)
    
    const option = {
      tooltip: {},
      series: [{
        type: 'graph',
        layout: 'force',
        force: {
          repulsion: 500,
          edgeLength: 100,
          gravity: 0.1,
          friction: 0.2
        },
        roam: true,
        draggable: true,
        data: nodes,
        links: links,
        label: {
          show: true,
          position: 'inside',
          fontSize: 14
        },
        symbolSize: 60,
        emphasis: {
          focus: 'adjacency'
        },
        lineStyle: {
          color: 'source',
          curveness: 0.3,
          type: 'solid'
        },
        edgeLabel: {
          show: true,
          formatter: (params: any) => params.data.label || '',
          fontSize: 10,
          position: 'middle'
        }
      }]
    }
    
    chart.setOption(option)
    chartInstances.value.set(messageId, chart)
    console.log('图谱渲染成功', messageId, '节点数:', nodes.length)
  }, 100)
}

// 设置图表容器 - 参考 Right.vue 的方式
const setGraphContainer = (el: any, messageId: number) => {
  if (!el || !(el instanceof HTMLElement)) {
    return
  }
  
  // 如果图表实例已存在，不重复初始化
  if (chartInstances.value.get(messageId)) {
    return
  }
  
  const messageItem = props.list.find(m => m.id === messageId)
  if (messageItem && messageItem.relationList && messageItem.relationList.length > 0) {
    renderGraph(el, messageItem.relationList as RelationItem[], messageId)
  }
}

// 切换图谱显示/隐藏
const toggleGraphVisibility = async (messageId: number) => {
  const wasVisible = graphVisibleMap.value[messageId]
  graphVisibleMap.value[messageId] = !wasVisible
  
  if (!wasVisible) {
    await nextTick()
    
    // 查找容器并渲染
    const containers = document.querySelectorAll('.graph-container')
    for (let i = 0; i < containers.length; i++) {
      const container = containers[i] as HTMLElement
      if (!chartInstances.value.get(messageId)) {
        const messageItem = props.list.find(m => m.id === messageId)
        if (messageItem && messageItem.relationList && messageItem.relationList.length > 0) {
          renderGraph(container, messageItem.relationList as RelationItem[], messageId)
        }
        break
      }
    }
    
    // 如果图表已存在，触发 resize
    const chart = chartInstances.value.get(messageId)
    if (chart) {
      setTimeout(() => chart.resize(), 100)
    }
  }
}

// 监听新消息，自动展开图谱
watch(() => props.list, (newList) => {
  if (newList && newList.length > 0) {
    const lastMessage = newList[newList.length - 1]
    if (lastMessage && 
        lastMessage.type !== 'user' && 
        lastMessage.relationList && 
        lastMessage.relationList.length > 0) {
      // 自动展开图谱
      graphVisibleMap.value[lastMessage.id] = true
      
      // 等待 DOM 渲染后渲染图表
      setTimeout(() => {
        const containers = document.querySelectorAll('.graph-container')
        if (containers.length > 0) {
          const lastContainer = containers[containers.length - 1] as HTMLElement
          if (lastContainer && !chartInstances.value.get(lastMessage.id)) {
            renderGraph(lastContainer, lastMessage.relationList as RelationItem[], lastMessage.id)
          }
        }
      }, 200)
    }
  }
}, { deep: true, immediate: true })

// ============ 滚动相关 ============

const scrollToBottom = async (isIgnore?: boolean) => {
  await nextTick()
  if ((isIgnore || !isScrolling.value) && messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight - messageContainer.value.offsetHeight
  }
}

const handleScroll = () => {
  if (!messageContainer.value) return
  const { scrollTop, scrollHeight, offsetHeight } = messageContainer.value
  isScrolling.value = scrollTop + offsetHeight < scrollHeight - 100
}

const handleGoBottom = () => {
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight
  }
}

const handlerGoTop = () => {
  if (messageContainer.value) {
    messageContainer.value.scrollTop = 0
  }
}

// 监听窗口大小变化
const handleWindowResize = () => {
  chartInstances.value.forEach((chart) => {
    if (chart) chart.resize()
  })
}

// ============ 消息操作 ============

const copyContent = async (content: string) => {
  await copy(content)
  message.success('复制成功！')
}

const onDelete = async (id: number) => {
  const chart = chartInstances.value.get(id)
  if (chart) {
    chart.dispose()
    chartInstances.value.delete(id)
  }
  await ChatMessageApi.deleteChatMessage(id)
  message.success('删除成功！')
  emits('onDeleteSuccess')
}

const onEdit = (msg: ChatMessageVO) => emits('onEdit', msg)

// 生命周期
onMounted(() => {
  if (messageContainer.value) {
    messageContainer.value.addEventListener('scroll', handleScroll)
  }
  window.addEventListener('resize', handleWindowResize)
})

onUnmounted(() => {
  chartInstances.value.forEach(chart => chart?.dispose())
  chartInstances.value.clear()
  if (messageContainer.value) {
    messageContainer.value.removeEventListener('scroll', handleScroll)
  }
  window.removeEventListener('resize', handleWindowResize)
})

defineExpose({ scrollToBottom, handlerGoTop })
</script>

<style scoped>
.graph-container {
  min-height: 400px;
  width: 100%;
  background: #fafafa;
}

.ai-avatar {
  background-color: transparent !important;
}

.ai-avatar :deep(img) {
  width: 24px !important;
  height: 24px !important;
  object-fit: contain;
}
</style>