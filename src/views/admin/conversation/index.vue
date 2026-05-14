<template>
  <ContentWrap>
    <!-- 搜索工作栏 -->
    <el-form
      class="-mb-15px"
      :model="queryParams"
      ref="queryFormRef"
      :inline="true"
      label-width="68px"
    >
      <el-form-item label="用户编号" prop="userId">
        <el-input
          v-model="queryParams.userId"
          placeholder="请输入用户编号"
          clearable
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="对话标题" prop="title">
        <el-input
          v-model="queryParams.title"
          placeholder="请输入对话标题"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="创建时间" prop="createTime">
        <el-date-picker
          v-model="queryParams.createTime"
          value-format="YYYY-MM-DD HH:mm:ss"
          type="daterange"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :default-time="[new Date('1 00:00:00'), new Date('1 23:59:59')]"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <el-table v-loading="loading" :data="list" :stripe="true" :show-overflow-tooltip="true">
      <el-table-column label="对话编号" align="center" prop="id" width="180" fixed="left" />
      <el-table-column label="对话标题" align="center" prop="title" width="200" />
      <el-table-column label="用户编号" align="center" prop="userId" width="120" />
      <el-table-column label="消息数量" align="center" prop="messageCount" width="100" />
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
      <el-table-column label="操作" align="center" width="120" fixed="right">
        <template #default="scope">
          <el-button
            link
            type="danger"
            @click="handleDelete(scope.row.id)"
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
</template>

<script setup lang="ts">
import { ContentWrap } from '@/components/ContentWrap'
import Pagination from '@/components/Pagination/index.vue'
import { formatDate } from '@/utils/formatTime'
import request from '@/config/axios'

const message = useMessage()
const { t } = useI18n()

const loading = ref(true)
const list = ref<any[]>([])
const total = ref(0)
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  userId: undefined as number | undefined,
  title: undefined as string | undefined,
  createTime: [] as string[]
})
const queryFormRef = ref()

const dateFormatter = (_row: any, _column: any, cellValue: string) => {
  return formatDate(cellValue)
}

const getList = async () => {
  loading.value = true
  try {
    const params: any = {
      pageNo: queryParams.pageNo,
      pageSize: queryParams.pageSize
    }
    if (queryParams.userId) params.userId = queryParams.userId
    if (queryParams.title) params.title = queryParams.title
    if (queryParams.createTime && queryParams.createTime.length === 2) {
      params.createTime = queryParams.createTime
    }
    
    const res = await request.get({
      url: '/graph/chat/conversation/page',
      params
    })
    
    console.log('对话列表API返回:', res)
    
    if (res && res.code === 0) {
      const data = res.data
      list.value = data?.list || []
      total.value = data?.total || 0
    } else {
      list.value = []
      total.value = 0
    }
  } catch (error) {
    console.error('获取列表失败:', error)
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

const resetQuery = () => {
  queryFormRef.value?.resetFields()
  queryParams.userId = undefined
  queryParams.title = undefined
  queryParams.createTime = []
  handleQuery()
}

const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    const res = await request.delete({
      url: '/graph/chat/conversation/delete-by-admin',
      params: { id }
    })
    if (res && res.code === 0) {
      message.success(t('common.delSuccess'))
      await getList()
    } else {
      message.error(res?.msg || '删除失败')
    }
  } catch (error) {
    console.error('删除失败:', error)
  }
}

onMounted(() => {
  getList()
})
</script>