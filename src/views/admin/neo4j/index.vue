<template>
  <ContentWrap>
    <div class="csv-import-neo4j">
      <el-card class="box-card">
        <template #header>
          <div class="card-header">
            <span>CSV导入知识图谱</span>
          </div>
        </template>

        <!-- 上传表单 -->
        <el-form :model="formData" label-width="100px">
          <el-form-item label="CSV文件" required>
            <div class="upload-with-filename">
              <el-upload
                ref="uploadRef"
                :action="uploadUrl"
                :headers="uploadHeaders"
                :data="uploadData"
                :before-upload="beforeUpload"
                :on-change="handleFileChange"
                :on-success="onUploadSuccess"
                :on-error="onUploadError"
                :show-file-list="false"
                :limit="1"
                accept=".csv"
                drag
              >
                <i class="el-icon-upload"></i>
                <div class="el-upload__text">将CSV文件拖到此处，或<em>点击上传</em></div>
                <template #tip>
                  <div class="el-upload__tip">
                    只能上传CSV文件，最大20MB，表头必须包含id字段
                  </div>
                </template>
              </el-upload>
              <div v-if="selectedFileName" class="file-info">
                <el-tag type="info" closable @close="clearSelectedFile">
                  {{ selectedFileName }}
                  <span v-if="selectedFileSize" class="file-size">
                    ({{ formatFileSize(selectedFileSize) }})
                  </span>
                </el-tag>
              </div>
            </div>
          </el-form-item>

          <el-form-item label="节点类型" required>
            <el-input
              v-model="formData.nodeType"
              placeholder="请输入节点类型（如User、Device）"
              clearable
            />
            <div class="el-form-item__tip">
              首字母必须为字母，仅支持字母、数字、下划线
            </div>
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              :loading="uploadLoading"
              @click="handleUpload"
              :disabled="!formData.file || !formData.nodeType"
            >
              开始导入
            </el-button>
            <el-button @click="handleReset">重置</el-button>
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
          <div class="progress-detail" v-if="uploadLoading">
            正在导入数据到Neo4j...
          </div>
        </div>

        <!-- 导入结果 -->
        <div v-if="importResult" class="import-result">
          <el-alert
            :title="importResult.title"
            :type="importResult.type"
            :description="importResult.message"
            show-icon
            :closable="false"
          />
        </div>
      </el-card>

      <!-- 导入历史日志 -->
      <el-card class="box-card" style="margin-top: 20px">
        <template #header>
          <div class="card-header">
            <span>导入历史记录</span>
            <el-button type="primary" size="small" @click="loadLogs">刷新</el-button>
          </div>
        </template>

        <el-table :data="logList" border stripe style="width: 100%">
          <el-table-column prop="id" label="日志ID" width="80" />
          <el-table-column prop="fileName" label="文件名" min-width="200" />
          <el-table-column prop="importTime" label="导入时间" width="180" />
          <el-table-column prop="recordCount" label="总记录数" width="100" />
          <el-table-column prop="successCount" label="成功数" width="100" />
          <el-table-column prop="failCount" label="失败数" width="100" />
          <el-table-column prop="createBy" label="操作人ID" width="100" />
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.failCount === 0 ? 'success' : 'danger'">
                {{ scope.row.failCount === 0 ? '成功' : '部分失败' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="errorMsg" label="错误信息" min-width="300" show-overflow-tooltip />
        </el-table>
      </el-card>
    </div>
  </ContentWrap>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ContentWrap } from '@/components/ContentWrap'
import { ElMessage, ElUpload } from 'element-plus'
import { getAccessToken } from '@/utils/auth' // ✅ 修复：使用YuDao标准的getAccessToken
import { Neo4jCsvAPI } from '@/api/admin/neo4j'
import type { CsvImportLogResp, CsvImportResp } from '@/api/admin/neo4j'

defineOptions({ name: 'CsvImportNeo4j' })

// 上传组件引用
const uploadRef = ref<InstanceType<typeof ElUpload>>()

// 状态变量
const uploadLoading = ref(false)
const showProgress = ref(false)
const progress = ref(0)
const progressStatus = ref<'success' | 'exception' | 'warning' | undefined>()
const importResult = ref<{title: string, type: 'success' | 'error' | 'warning', message: string} | null>(null)
const logList = ref<CsvImportLogResp[]>([])

// 表单数据
const formData = reactive({
  file: null as File | null,
  nodeType: ''
})

// 新增：显示文件名的状态
const selectedFileName = ref('')
const selectedFileSize = ref(0)

// 上传配置
const uploadUrl = import.meta.env.VITE_APP_BASE_API + '/graph/neo4j/csv/upload'
const uploadHeaders = {
  Authorization: 'Bearer ' + getAccessToken()
}
const uploadData = computed(() => ({
  nodeType: formData.nodeType
}))

// 页面加载时获取日志
onMounted(() => {
  loadLogs()
})

// 加载导入日志
const loadLogs = async () => {
  try {
    const res = await Neo4jCsvAPI.getImportLogs()
    logList.value = res
  } catch (error: any) {
    ElMessage.error(error?.message || '获取日志失败')
  }
}

// 上传前校验
const beforeUpload = (file: File) => {
  // 校验文件类型
  const isCsv = file.name.toLowerCase().endsWith('.csv')
  if (!isCsv) {
    ElMessage.error('只能上传CSV格式文件！')
    return false
  }

  // 校验文件大小（20MB）
  const isLt20M = file.size / 1024 / 1024 < 20
  if (!isLt20M) {
    ElMessage.error('文件大小不能超过20MB！')
    return false
  }

  // 注意：不在此处设置 formData.file，交给 handleFileChange 统一处理
  return false // 阻止自动上传
}

// 文件列表变化时的处理（显示文件名、保存文件对象）
const handleFileChange = (file: any, fileList: any[]) => {
  if (fileList.length > 0) {
    const rawFile = file.raw
    if (rawFile) {
      selectedFileName.value = rawFile.name
      selectedFileSize.value = rawFile.size
      formData.file = rawFile
    }
  } else {
    // 文件列表为空（用户主动删除或清空）
    selectedFileName.value = ''
    selectedFileSize.value = 0
    formData.file = null
  }
}

// 清除已选文件
const clearSelectedFile = () => {
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
  selectedFileName.value = ''
  selectedFileSize.value = 0
  formData.file = null
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 手动触发上传
const handleUpload = async () => {
  if (!formData.file) {
    ElMessage.warning('请先选择CSV文件')
    return
  }
  if (!formData.nodeType) {
    ElMessage.warning('请输入节点类型')
    return
  }

  // 校验节点类型格式
  const nodeTypeRegex = /^[a-zA-Z][a-zA-Z0-9_]*$/
  if (!nodeTypeRegex.test(formData.nodeType)) {
    ElMessage.error('节点类型非法（首字母必须为字母，仅支持字母、数字、下划线）')
    return
  }

  uploadLoading.value = true
  showProgress.value = true
  progress.value = 0
  progressStatus.value = undefined
  importResult.value = null

  // 模拟进度（实际后端无法实时返回进度，这里做个假进度）
  const progressInterval = setInterval(() => {
    if (progress.value < 90) {
      progress.value += 10
    }
  }, 500)

  try {
    // 构建FormData
    const formDataObj = new FormData()
    formDataObj.append('file', formData.file)
    formDataObj.append('nodeType', formData.nodeType)

    // 调用上传接口
    const res: CsvImportResp = await Neo4jCsvAPI.uploadCsv(formDataObj)

    clearInterval(progressInterval)
    progress.value = 100

    // 处理结果
    if (res.success) {
      progressStatus.value = 'success'
      importResult.value = {
        title: '导入成功',
        type: 'success',
        message: `成功导入 ${res.successCount} 条记录，失败 ${res.failCount} 条`
      }
      ElMessage.success('导入完成')
    } else {
      progressStatus.value = res.failCount > 0 ? 'warning' : 'exception'
      importResult.value = {
        title: '导入失败',
        type: 'error',
        message: res.message || '导入过程发生错误'
      }
      ElMessage.error('导入失败')
    }

    // 刷新日志列表
    loadLogs()
  } catch (error: any) {
    clearInterval(progressInterval)
    progress.value = 100
    progressStatus.value = 'exception'
    importResult.value = {
      title: '导入异常',
      type: 'error',
      message: error?.message || '服务器异常，请稍后重试'
    }
    ElMessage.error('导入异常')
  } finally {
    uploadLoading.value = false
  }
}

// 重置表单
const handleReset = () => {
  formData.file = null
  formData.nodeType = ''
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
  selectedFileName.value = ''
  selectedFileSize.value = 0
  showProgress.value = false
  importResult.value = null
}

// 上传成功回调（这里用不到，因为我们手动上传，但保留空实现）
const onUploadSuccess = () => {}

// 上传失败回调（这里用不到，因为我们手动上传，但保留空实现）
const onUploadError = () => {}
</script>

<style lang="scss" scoped>
.csv-import-neo4j {
  .box-card {
    max-width: 900px;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .upload-with-filename {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;

    .el-upload {
      flex: 1;
      min-width: 200px;
    }

    .file-info {
      display: flex;
      align-items: center;

      .el-tag {
        cursor: default;
        font-size: 14px;
        padding: 0 8px 0 12px;
        line-height: 32px;

        .file-size {
          margin-left: 6px;
          font-size: 12px;
          color: #909399;
        }

        :deep(.el-tag__close) {
          margin-left: 8px;
          cursor: pointer;
        }
      }
    }
  }

  .el-upload-dragger {
    width: 100%;
  }

  .el-form-item__tip {
    margin-top: 4px;
    font-size: 12px;
    color: #909399;
  }

  .progress-section {
    margin-top: 20px;

    .progress-detail {
      margin-top: 10px;
      font-size: 14px;
      color: #909399;
      text-align: center;
    }
  }

  .import-result {
    margin-top: 20px;
  }
}
</style>