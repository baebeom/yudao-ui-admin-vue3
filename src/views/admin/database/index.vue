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
            <el-select v-model="formData.dbType" placeholder="请选择数据库类型" @change="handleDbTypeChange">
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
            <el-input v-model="formData.password" type="password" placeholder="请输入密码" show-password />
          </el-form-item>

          <el-form-item label="表名">
            <el-select
              v-model="formData.tables"
              multiple
              filterable
              allow-create
              default-first-option
              placeholder="请先测试连接获取表列表"
              :disabled="tableOptions.length === 0"
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
            <el-button type="primary" :loading="testLoading" @click="handleTestConnection">
              测试连接
            </el-button>
            <el-button type="success" :loading="importLoading" @click="handleImport" :disabled="formData.tables.length === 0">
              开始导入
            </el-button>
          </el-form-item>
        </el-form>

        <!-- 导入进度 -->
        <div v-if="showProgress" class="progress-section">
          <el-progress
            :percentage="progress"
            :status="progressStatus"
            :stroke-width="20"
            striped
            striped-flow
          />
          <div class="progress-detail" v-if="importingTable">
            正在导入: {{ importingTable }}
          </div>
        </div>

        <!-- 导入结果 -->
        <div v-if="importResult.length > 0" class="import-result">
          <el-alert
            v-for="(result, index) in importResult"
            :key="index"
            :title="result.title"
            :type="result.type"
            :description="result.message"
            show-icon
            :closable="false"
            style="margin-top: 10px"
          />
        </div>
      </el-card>
    </div>
  </ContentWrap>
</template>

<script setup lang="ts">
import { ContentWrap } from '@/components/ContentWrap'
import { ElMessage } from 'element-plus'
import { DatabaseAPI } from '@/api/admin'
import type { DatabaseConfig } from '@/api/admin/database'

defineOptions({ name: 'DatabaseImport' })

const testLoading = ref(false)
const importLoading = ref(false)
const showProgress = ref(false)
const progress = ref(0)
const progressStatus = ref<'success' | 'exception' | 'warning' | undefined>()
const importingTable = ref('')
const importResult = ref<Array<{title: string, type: 'success' | 'error' | 'warning', message: string}>>([])

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

// 默认端口映射
const defaultPorts: Record<string, string> = {
  mysql: '3306',
  postgresql: '5432',
  sqlserver: '1433',
  oracle: '1521'
}

const handleDbTypeChange = (value: string) => {
  formData.port = defaultPorts[value] || ''
  tableOptions.value = []
  formData.tables = []
}

// 测试数据库连接并获取表列表
const handleTestConnection = async () => {
  if (!formData.host || !formData.database || !formData.username) {
    ElMessage.warning('请填写完整的主机地址、数据库名和用户名')
    return
  }

  testLoading.value = true
  importResult.value = []
  
  try {
    const config: DatabaseConfig = {
      dbType: formData.dbType as DatabaseConfig['dbType'],
      host: formData.host,
      port: parseInt(formData.port) || parseInt(defaultPorts[formData.dbType]),
      database: formData.database,
      username: formData.username,
      password: formData.password
    }
    
    // 测试连接
    const testRes = await DatabaseAPI.testConnection(config)
    if (testRes === true) {
      ElMessage.success('连接成功')
      
      // 获取表列表
      const tablesRes = await DatabaseAPI.getTableList(config)
      if (tablesRes && Array.isArray(tablesRes)) {
        tableOptions.value = tablesRes
        if (tableOptions.value.length === 0) {
          ElMessage.warning('未获取到任何表')
        } else {
          ElMessage.success(`获取到 ${tableOptions.value.length} 个表`)
        }
      } else {
        tableOptions.value = []
        ElMessage.warning('获取表列表失败')
      }
    } else {
      ElMessage.error('连接失败')
      tableOptions.value = []
    }
  } catch (error: any) {
    console.error('连接失败:', error)
    ElMessage.error(error?.message || '连接失败')
    tableOptions.value = []
  } finally {
    testLoading.value = false
  }
}

// 导入数据
const handleImport = async () => {
  if (formData.tables.length === 0) {
    ElMessage.warning('请选择要导入的表')
    return
  }
  
  importLoading.value = true
  showProgress.value = true
  progress.value = 0
  progressStatus.value = undefined
  importResult.value = []
  
  const config: DatabaseConfig = {
    dbType: formData.dbType as DatabaseConfig['dbType'],
    host: formData.host,
    port: parseInt(formData.port) || parseInt(defaultPorts[formData.dbType]),
    database: formData.database,
    username: formData.username,
    password: formData.password
  }
  
  const successTables: string[] = []
  const failTables: string[] = []
  
  try {
    for (let i = 0; i < formData.tables.length; i++) {
      const tableName = formData.tables[i]
      importingTable.value = tableName
      progress.value = (i / formData.tables.length) * 100
      
      try {
        const res = await DatabaseAPI.importTable({
          ...config,
          tableName
        })
        
        if (res.success === true) {
          successTables.push(tableName)
          importResult.value.push({
            title: `${tableName} 导入成功`,
            type: 'success',
            message: `成功导入 ${res.recordCount || 0} 条记录`
          })
        } else {
          failTables.push(tableName)
          importResult.value.push({
            title: `${tableName} 导入失败`,
            type: 'error',
            message: res.message || '未知错误'
          })
        }
      } catch (error: any) {
        failTables.push(tableName)
        importResult.value.push({
          title: `${tableName} 导入失败`,
          type: 'error',
          message: error?.message || '导入异常'
        })
      }
      
      progress.value = ((i + 1) / formData.tables.length) * 100
    }
    
    // 导入完成
    progress.value = 100
    if (failTables.length === 0) {
      progressStatus.value = 'success'
      ElMessage.success(`成功导入 ${successTables.length} 个表`)
    } else if (successTables.length === 0) {
      progressStatus.value = 'exception'
      ElMessage.error('所有表导入失败')
    } else {
      progressStatus.value = 'warning'
      ElMessage.warning(`成功 ${successTables.length} 个，失败 ${failTables.length} 个`)
    }
  } catch (error: any) {
    progressStatus.value = 'exception'
    ElMessage.error('导入过程发生异常')
    console.error('导入异常:', error)
  } finally {
    importLoading.value = false
    importingTable.value = ''
  }
}
</script>

<style lang="scss" scoped>
.database-import {
  .box-card {
    max-width: 700px;
  }
  
  .progress-section {
    margin-top: 20px;
    
    .progress-detail {
      margin-top: 10px;
      text-align: center;
      color: #909399;
      font-size: 14px;
    }
  }
  
  .import-result {
    margin-top: 20px;
  }
}
</style>