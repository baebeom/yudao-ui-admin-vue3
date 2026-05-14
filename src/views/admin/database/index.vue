<template>
  <ContentWrap>
    <div class="database-import">
      <el-card class="box-card">
        <template #header>
          <div class="card-header">
            <span>数据库导入</span>
          </div>
        </template>

        <el-form :model="formData" label-width="100px">
          <el-form-item label="数据库类型">
            <el-select v-model="formData.dbType" placeholder="请选择数据库类型">
              <el-option label="MySQL" value="mysql" />
              <el-option label="PostgreSQL" value="postgresql" />
              <el-option label="SQL Server" value="sqlserver" />
              <el-option label="Oracle" value="oracle" />
            </el-select>
          </el-form-item>

          <el-form-item label="主机地址">
            <el-input v-model="formData.host" placeholder="localhost" />
          </el-form-item>

          <el-form-item label="端口号">
            <el-input v-model="formData.port" placeholder="3306" />
          </el-form-item>

          <el-form-item label="数据库名">
            <el-input v-model="formData.database" placeholder="请输入数据库名" />
          </el-form-item>

          <el-form-item label="用户名">
            <el-input v-model="formData.username" placeholder="root" />
          </el-form-item>

          <el-form-item label="密码">
            <el-input v-model="formData.password" type="password" placeholder="请输入密码" />
          </el-form-item>

          <el-form-item label="表名">
            <el-select
              v-model="formData.tables"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="请选择或输入表名"
            >
              <el-option
                v-for="item in tableOptions"
                :key="item"
                :label="item"
                :value="item"
              />
            </el-select>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" :loading="loading" @click="handleTestConnection">
              测试连接
            </el-button>
            <el-button type="success" :loading="loading" @click="handleImport">
              开始导入
            </el-button>
          </el-form-item>
        </el-form>

        <el-progress
          v-if="showProgress"
          :percentage="progress"
          :status="progressStatus"
          :stroke-width="20"
          striped
          striped-flow
        />
      </el-card>
    </div>
  </ContentWrap>
</template>

<script setup lang="ts">
import { ContentWrap } from '@/components/ContentWrap'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const showProgress = ref(false)
const progress = ref(0)
const progressStatus = ref<'success' | 'exception' | 'warning' | undefined>()

const formData = reactive({
  dbType: 'mysql',
  host: 'localhost',
  port: '3306',
  database: '',
  username: 'root',
  password: '',
  tables: [] as string[]
})

const tableOptions = ref<string[]>([])

const handleTestConnection = async () => {
  loading.value = true
  try {
    // TODO: 调用实际API
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('连接成功')
    tableOptions.value = ['user', 'order', 'product', 'category']
  } catch (error) {
    ElMessage.error('连接失败')
  } finally {
    loading.value = false
  }
}

const handleImport = async () => {
  if (formData.tables.length === 0) {
    ElMessage.warning('请选择要导入的表')
    return
  }
  
  loading.value = true
  showProgress.value = true
  progress.value = 0
  progressStatus.value = undefined
  
  try {
    for (let i = 0; i < formData.tables.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 500))
      progress.value = ((i + 1) / formData.tables.length) * 100
    }
    progressStatus.value = 'success'
    ElMessage.success('导入成功')
  } catch (error) {
    progressStatus.value = 'exception'
    ElMessage.error('导入失败')
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.database-import {
  .box-card {
    max-width: 600px;
  }
}
</style>