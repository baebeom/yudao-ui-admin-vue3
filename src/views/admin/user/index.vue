<template>
  <ContentWrap>
    <div class="user-management">
      <el-form :inline="true" :model="searchParams" class="search-form">
        <el-form-item label="用户名">
          <el-input v-model="searchParams.username" placeholder="请输入用户名" clearable />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="searchParams.nickname" placeholder="请输入昵称" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
          <el-button type="success" @click="handleAdd">新增用户</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="userList" v-loading="loading" stripe>
        <el-table-column prop="id" label="用户ID" width="80" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column prop="nickname" label="昵称" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="mobile" label="手机号" />
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            <el-button link type="warning" @click="handleResetPwd(row)">重置密码</el-button>
          </template>
        </el-table-column>
      </el-table>

      <Pagination
        :total="total"
        v-model:page="queryParams.pageNo"
        v-model:limit="queryParams.pageSize"
        @pagination="getList"
      />

      <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px">
        <el-form :model="formData" :rules="rules" ref="formRef" label-width="100px">
          <el-form-item label="用户名" prop="username">
            <el-input v-model="formData.username" :disabled="dialogType === 'edit'" />
          </el-form-item>
          <el-form-item label="昵称" prop="nickname">
            <el-input v-model="formData.nickname" />
          </el-form-item>
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="formData.email" />
          </el-form-item>
          <el-form-item label="手机号" prop="mobile">
            <el-input v-model="formData.mobile" />
          </el-form-item>
          <el-form-item v-if="dialogType === 'add'" label="密码" prop="password">
            <el-input v-model="formData.password" type="password" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确定</el-button>
        </template>
      </el-dialog>

      <el-dialog v-model="pwdDialogVisible" title="重置密码" width="400px">
        <el-form :model="pwdForm" label-width="100px">
          <el-form-item label="新密码">
            <el-input v-model="pwdForm.password" type="password" />
          </el-form-item>
          <el-form-item label="确认密码">
            <el-input v-model="pwdForm.confirmPassword" type="password" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="pwdDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmitPwd">确定</el-button>
        </template>
      </el-dialog>
    </div>
  </ContentWrap>
</template>

<script setup lang="ts">
import { ContentWrap } from '@/components/ContentWrap'
import Pagination from '@/components/Pagination/index.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as UserApi from '@/api/system/user'

const loading = ref(false)
const userList = ref<UserApi.UserVO[]>([])
const total = ref(0)

const searchParams = reactive({
  username: '',
  nickname: ''
})

const queryParams = reactive({
  pageNo: 1,
  pageSize: 10
})

const dialogVisible = ref(false)
const dialogTitle = ref('')
const dialogType = ref<'add' | 'edit'>('add')
const formRef = ref()
const formData = reactive({
  id: 0,
  username: '',
  nickname: '',
  email: '',
  mobile: '',
  password: ''
})

const pwdDialogVisible = ref(false)
const currentUser = ref<any>(null)
const pwdForm = reactive({
  password: '',
  confirmPassword: ''
})

// 修复：使用正确的验证规则格式
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  email: [
    { 
      required: false, 
      pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      message: '请输入正确的邮箱', 
      trigger: 'blur' 
    }
  ]
}

const getList = async () => {
  loading.value = true
  try {
    const res = await UserApi.getUserPage(queryParams)
    userList.value = (res as any).list || []
    total.value = (res as any).total || 0
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  queryParams.pageNo = 1
  getList()
}

const resetSearch = () => {
  searchParams.username = ''
  searchParams.nickname = ''
  handleSearch()
}

const handleAdd = () => {
  dialogType.value = 'add'
  dialogTitle.value = '新增用户'
  Object.assign(formData, { id: 0, username: '', nickname: '', email: '', mobile: '', password: '' })
  dialogVisible.value = true
}

const handleEdit = (row: UserApi.UserVO) => {
  dialogType.value = 'edit'
  dialogTitle.value = '编辑用户'
  Object.assign(formData, row)
  dialogVisible.value = true
}

const handleDelete = (row: UserApi.UserVO) => {
  ElMessageBox.confirm(`确定要删除用户 "${row.username}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    ElMessage.success('删除成功')
    getList()
  }).catch(() => {})
}

const handleResetPwd = (row: UserApi.UserVO) => {
  currentUser.value = row
  pwdForm.password = ''
  pwdForm.confirmPassword = ''
  pwdDialogVisible.value = true
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  ElMessage.success('操作成功')
  dialogVisible.value = false
  getList()
}

const handleSubmitPwd = async () => {
  if (pwdForm.password !== pwdForm.confirmPassword) {
    ElMessage.error('两次输入的密码不一致')
    return
  }
  ElMessage.success('密码重置成功')
  pwdDialogVisible.value = false
}

onMounted(() => {
  getList()
})
</script>