<template>
  <div ref="messageContainer" class="h-100% overflow-y-auto relative">
    <div class="flex flex-col overflow-y-hidden px-20px" v-for="(item, index) in list" :key="index">
      <!-- 靠左 message：system、assistant 类型 -->
      <div class="flex flex-row mt-50px" v-if="item.type !== 'user'">
        <div class="avatar">
          <el-avatar :src="roleAvatar" />
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
            
            <!-- 知识图谱区域 -->
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
              
              <!-- 知识图谱内容 -->
              <div
                v-show="graphVisibleMap[item.id]"
                class="mt-8px p-8px bg-white/70 backdrop-blur-sm border border-gray-200/60 rounded-8px shadow-sm"
              >
                <div :ref="(el) => setGraphContainer(el, item.id)" class="graph-container" style="height: 400px; width: 100%; min-height: 400px;"></div>
              </div>
            </div>
          </div>
          <!-- AI 回答的按钮组（复制和删除） -->
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
          <!-- 用户消息的按钮组（复制、删除、编辑） -->
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
import userAvatarDefaultImg from '@/assets/imgs/avatar.gif'
import roleAvatarDefaultImg from '@/assets/ai/gpt.svg'

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

const userAvatar = computed(() => userStore.user.avatar || userAvatarDefaultImg)
const roleAvatar = computed(() => props.conversation.roleAvatar ?? roleAvatarDefaultImg)

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

// 构建图谱数据
const buildGraphData = (relationList: any[]) => {
  const nodes: any[] = []
  const links: any[] = []
  const nodeSet = new Set()
  
  for (const item of relationList) {
    if (!nodeSet.has(item.entity1)) {
      nodeSet.add(item.entity1)
      nodes.push({
        id: item.entity1,
        name: item.entity1,
        symbolSize: Math.min(60, Math.max(40, item.entity1.length * 2.5))
      })
    }
    
    if (!nodeSet.has(item.entity2)) {
      nodeSet.add(item.entity2)
      nodes.push({
        id: item.entity2,
        name: item.entity2,
        symbolSize: Math.min(60, Math.max(40, item.entity2.length * 2.5))
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

// 初始化知识图谱
const initGraph = (container: HTMLElement, relationList: any[], messageId: number) => {
  if (!container || !relationList || relationList.length === 0) return
  
  const init = () => {
    const width = container.clientWidth
    const height = container.clientHeight
    
    if (width === 0 || height === 0) {
      setTimeout(init, 100)
      return
    }
    
    const { nodes, links } = buildGraphData(relationList)
    if (nodes.length === 0) return
    
    if (chartInstances.value.get(messageId)) {
      chartInstances.value.get(messageId).dispose()
    }
    
    const chart = echarts.init(container)
    
    const option = {
      title: { show: false },
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
          fontSize: 12
        },
        symbolSize: 50,
        emphasis: { focus: 'adjacency' },
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
    setTimeout(() => chart.resize(), 50)
  }
  
  init()
}

// 设置图表容器
const setGraphContainer = async (el: any, messageId: number) => {
  if (!el) return
  
  await nextTick()
  await new Promise(resolve => requestAnimationFrame(resolve))
  
  if (!chartInstances.value.get(messageId)) {
    const message = props.list.find(m => m.id === messageId)
    if (message && message.relationList && message.relationList.length > 0) {
      initGraph(el, message.relationList, messageId)
    }
  }
}

// 切换图谱显示/隐藏
const toggleGraphVisibility = async (messageId: number) => {
  graphVisibleMap.value[messageId] = !graphVisibleMap.value[messageId]
  if (graphVisibleMap.value[messageId]) {
    await nextTick()
    const chart = chartInstances.value.get(messageId)
    if (chart) {
      chart.resize()
    }
  }
}

// 监听新消息，自动展开图谱
watch(() => props.list, (newList) => {
  if (newList && newList.length > 0) {
    const lastMessage = newList[newList.length - 1]
    if (lastMessage && lastMessage.type !== 'user' && lastMessage.relationList && lastMessage.relationList.length > 0) {
      graphVisibleMap.value[lastMessage.id] = true
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

// defineExpose 放在最后，不要在 async 函数内部
defineExpose({ scrollToBottom, handlerGoTop })
</script>

<style scoped>
.graph-container {
  min-height: 350px;
  min-width: 100%;
  border-radius: 8px;
  background: #fafafa;
  width: 100% !important;
}
</style>