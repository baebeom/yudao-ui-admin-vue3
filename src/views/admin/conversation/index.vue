<template>
  <div>
    <ContentWrap>
      <!-- 搜索工作栏 -->
      <el-form
        class="-mb-15px"
        :model="queryParams"
        ref="queryFormRef"
        :inline="true"
        label-width="70px"
      >
        <el-form-item label="用户编号" prop="userId">
          <el-input-number
            v-model="queryParams.userId"
            placeholder="请输入用户编号"
            clearable
            :min="1"
            controls-position="right"
            class="!w-200px"
          />
        </el-form-item>
        <el-form-item label="对话标题" prop="title">
          <el-input
            v-model="queryParams.title"
            placeholder="请输入对话标题"
            clearable
            @keyup.enter="handleQuery"
            class="!w-200px"
          />
        </el-form-item>
        <el-form-item label="是否置顶" prop="pinned">
          <el-select v-model="queryParams.pinned" placeholder="请选择" clearable class="!w-100px">
            <el-option label="已置顶" :value="true" />
            <el-option label="未置顶" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item label="创建时间" prop="createTime">
          <el-date-picker
            v-model="queryParams.createTime"
            value-format="YYYY-MM-DD HH:mm:ss"
            type="daterange"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            :default-time="[new Date('2000-01-01 00:00:00'), new Date('2000-01-01 23:59:59')]"
            class="!w-260px"
          />
        </el-form-item>
        <el-form-item>
          <el-button @click="handleQuery" type="primary">
            <Icon icon="ep:search" class="mr-5px" /> 搜索
          </el-button>
          <el-button @click="resetQuery">
            <Icon icon="ep:refresh" class="mr-5px" /> 重置
          </el-button>
        </el-form-item>
      </el-form>
    </ContentWrap>

    <!-- 列表 -->
    <ContentWrap>
      <el-table v-loading="loading" :data="list" :stripe="true" :show-overflow-tooltip="true">
        <el-table-column label="对话编号" align="center" prop="id" width="100" fixed="left" />
        <el-table-column label="对话标题" align="center" prop="title" min-width="200" show-overflow-tooltip />
        <el-table-column label="用户编号" align="center" prop="userId" width="100" />
        <el-table-column label="是否置顶" align="center" prop="pinned" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.pinned ? 'success' : 'info'">
              {{ scope.row.pinned ? '已置顶' : '未置顶' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="创建时间"
          align="center"
          prop="createTime"
          :formatter="dateFormatter"
          width="180px"
        />
        <el-table-column label="操作" align="center" width="150" fixed="right">
          <template #default="scope">
            <el-button
              link
              type="primary"
              @click="handleViewMessages(scope.row)"
            >
              查看消息
            </el-button>
            <el-button
              link
              type="danger"
              @click="handleDelete(scope.row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <!-- 分页 -->
      <Pagination
        :total="total"
        v-model:page="queryParams.pageNo"
        v-model:limit="queryParams.pageSize"
        @pagination="getList"
      />
    </ContentWrap>

    <!-- 消息详情对话框 -->
    <el-dialog v-model="messageDialogVisible" :title="`对话消息 - ${currentConversation?.title || ''}`" width="800px" @close="handleMessageDialogClose">
      <div class="message-list" v-loading="messageLoading">
        <div
          v-for="message in messageList"
          :key="message.id"
          :class="['message-item', message.type]"
        >
          <div class="message-header">
            <span class="message-role">{{ message.type === 'user' ? '用户' : 'AI助手' }}</span>
            <span class="message-time">{{ formatDate(message.createTime) }}</span>
          </div>
          <div class="message-content">{{ message.content }}</div>
          <div v-if="message.graph" class="message-graph">
            <el-button link type="primary" size="small" @click="viewGraph(message.graph)">
              查看图谱
            </el-button>
          </div>
        </div>
        <div v-if="messageList.length === 0 && !messageLoading" class="empty-message">
          暂无消息记录
        </div>
      </div>
      <template #footer>
        <el-button @click="messageDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 图谱预览对话框 -->
    <el-dialog v-model="graphDialogVisible" title="知识图谱预览" width="70%" @close="destroyGraph">
      <div class="graph-container" ref="graphContainerRef"></div>
      <template #footer>
        <el-button @click="graphDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ContentWrap } from '@/components/ContentWrap'
import Pagination from '@/components/Pagination/index.vue'
import { formatDate } from '@/utils/formatTime'
import { ConversationAPI } from '@/api/admin'
import type { ConversationVO, MessageVO } from '@/api/admin/conversation'
import { ElMessage, ElMessageBox } from 'element-plus'

defineOptions({ name: 'ConversationManagement' })

const loading = ref(true)
const messageLoading = ref(false)
const list = ref<ConversationVO[]>([])
const total = ref(0)
const messageList = ref<MessageVO[]>([])
const messageDialogVisible = ref(false)
const graphDialogVisible = ref(false)
const currentConversation = ref<ConversationVO | null>(null)
const graphContainerRef = ref<HTMLElement>()
let chartInstance: any = null

const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  userId: undefined as number | undefined,
  title: undefined as string | undefined,
  pinned: undefined as boolean | undefined,
  createTime: [] as string[]
})
const queryFormRef = ref()

const dateFormatter = (_row: any, _column: any, cellValue: string) => {
  return formatDate(cellValue)
}

// 获取对话列表
const getList = async () => {
  loading.value = true
  try {
    const params: any = {
      pageNo: queryParams.pageNo,
      pageSize: queryParams.pageSize
    }
    if (queryParams.userId) params.userId = queryParams.userId
    if (queryParams.title) params.title = queryParams.title
    if (queryParams.pinned !== undefined) params.pinned = queryParams.pinned
    if (queryParams.createTime && queryParams.createTime.length === 2) {
      params.createTimeBegin = queryParams.createTime[0]
      params.createTimeEnd = queryParams.createTime[1]
    }
    
    const res = await ConversationAPI.getConversationPage(params)
    console.log('对话列表响应:', res)
    
    const data = res as any
    list.value = data?.list || []
    total.value = data?.total || 0
  } catch (error) {
    console.error('获取列表失败:', error)
    list.value = []
    total.value = 0
    ElMessage.error('获取列表失败')
  } finally {
    loading.value = false
  }
}

// 查看对话消息
const handleViewMessages = async (row: ConversationVO) => {
  currentConversation.value = row
  messageDialogVisible.value = true
  messageLoading.value = true
  
  try {
    console.log('请求消息列表, conversationId:', row.id)
    const res = await ConversationAPI.getMessageListByConversationId(row.id)
    console.log('消息列表响应:', res)
    
    const data = res as any
    if (data && Array.isArray(data)) {
      messageList.value = data
    } else if (data?.list && Array.isArray(data.list)) {
      messageList.value = data.list
    } else {
      messageList.value = []
      console.warn('消息列表数据格式异常:', data)
    }
  } catch (error) {
    console.error('获取消息列表失败:', error)
    messageList.value = []
    ElMessage.error('获取消息列表失败')
  } finally {
    messageLoading.value = false
  }
}

// 查看图谱
const viewGraph = async (graphJson: string | object) => {
  graphDialogVisible.value = true
  await nextTick()
  
  try {
    // 动态导入 echarts
    const echartsModule = await import('echarts')
    const echarts = (echartsModule as any).default || echartsModule
    
    let graphData: any = graphJson
    if (typeof graphJson === 'string') {
      graphData = JSON.parse(graphJson)
    }
    
    console.log('图谱数据:', graphData)
    
    const container = graphContainerRef.value
    if (!container) return
    
    // 清空容器
    container.innerHTML = ''
    
    let nodes: any[] = []
    let links: any[] = []
    
    // 情况1: 直接是数组格式 [{entity1, rel, entity2}, ...]
    if (Array.isArray(graphData) && graphData.length > 0 && graphData[0].entity1) {
      const nodeSet = new Set()
      for (const item of graphData) {
        if (!item.entity1 || !item.entity2) continue
        
        if (!nodeSet.has(item.entity1)) {
          nodeSet.add(item.entity1)
          nodes.push({ 
            id: item.entity1, 
            name: item.entity1, 
            symbolSize: 50,
            category: item.entity1_type || '未知'
          })
        }
        
        if (!nodeSet.has(item.entity2)) {
          nodeSet.add(item.entity2)
          nodes.push({ 
            id: item.entity2, 
            name: item.entity2, 
            symbolSize: 50,
            category: item.entity2_type || '未知'
          })
        }
        
        links.push({ 
          source: item.entity1, 
          target: item.entity2, 
          label: item.rel || '关系'
        })
      }
    }
    // 情况2: 包含 relationList 属性
    else if (graphData.relationList && Array.isArray(graphData.relationList)) {
      const nodeSet = new Set()
      for (const item of graphData.relationList) {
        if (!item.entity1 || !item.entity2) continue
        
        if (!nodeSet.has(item.entity1)) {
          nodeSet.add(item.entity1)
          nodes.push({ id: item.entity1, name: item.entity1, symbolSize: 50 })
        }
        
        if (!nodeSet.has(item.entity2)) {
          nodeSet.add(item.entity2)
          nodes.push({ id: item.entity2, name: item.entity2, symbolSize: 50 })
        }
        
        links.push({ source: item.entity1, target: item.entity2, label: item.rel })
      }
    }
    // 情况3: 已经是 nodes/links 格式
    else if (graphData.nodes && graphData.links) {
      nodes = graphData.nodes
      links = graphData.links
    }
    else {
      console.warn('未知的图谱数据格式:', graphData)
      ElMessage.error('图谱数据格式错误')
      return
    }
    
    if (nodes.length === 0) {
      ElMessage.warning('无图谱数据')
      return
    }
    
    console.log('图谱节点:', nodes, '关系:', links)
    
    // 初始化图表
    const chart = echarts.init(container)
    chart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            return params.name
          }
          return params.data.label || ''
        }
      },
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
          fontSize: 12,
          formatter: (params: any) => {
            return params.name.length > 15 ? params.name.slice(0, 15) + '...' : params.name
          }
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
        },
        emphasis: {
          focus: 'adjacency'
        }
      }]
    })
    
    chartInstance = chart
  } catch (error) {
    console.error('渲染图谱失败:', error)
    ElMessage.error('渲染图谱失败')
  }
}

// 销毁图谱实例
const destroyGraph = () => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
}

// 搜索
const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

// 重置搜索
const resetQuery = () => {
  queryFormRef.value?.resetFields()
  queryParams.userId = undefined
  queryParams.title = undefined
  queryParams.pinned = undefined
  queryParams.createTime = []
  handleQuery()
}

// 删除对话
const handleDelete = async (row: ConversationVO) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除对话 "${row.title}" 吗？删除后该对话的所有消息也会被删除。`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const res = await ConversationAPI.deleteConversationByAdmin(row.id)
    console.log('删除响应:', res)
    
    const result = res as any
    if (result === true || result?.success === true) {
      ElMessage.success('删除成功')
      await getList()
    } else {
      ElMessage.error(result?.msg || '删除失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 关闭消息对话框时清理
const handleMessageDialogClose = () => {
  messageList.value = []
  currentConversation.value = null
}

// 监听窗口大小变化
const handleWindowResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

// 生命周期
onMounted(() => {
  getList()
  window.addEventListener('resize', handleWindowResize)
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
  window.removeEventListener('resize', handleWindowResize)
})
</script>

<style lang="scss" scoped>
.message-list {
  max-height: 500px;
  overflow-y: auto;
  
  .message-item {
    margin-bottom: 20px;
    padding: 12px;
    border-radius: 8px;
    
    &.user {
      background-color: #f0f7ff;
      border-left: 4px solid #409eff;
    }
    
    &.system {
      background-color: #f5f5f5;
      border-left: 4px solid #67c23a;
    }
    
    .message-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 12px;
      
      .message-role {
        font-weight: bold;
        color: #333;
      }
      
      .message-time {
        color: #999;
      }
    }
    
    .message-content {
      line-height: 1.6;
      color: #333;
      white-space: pre-wrap;
      word-break: break-word;
    }
    
    .message-graph {
      margin-top: 8px;
      text-align: right;
    }
  }
  
  .empty-message {
    text-align: center;
    padding: 40px;
    color: #999;
  }
}

.graph-container {
  width: 100%;
  height: 500px;
  border: 1px solid #eee;
  border-radius: 4px;
  background-color: #fafafa;
}
</style>