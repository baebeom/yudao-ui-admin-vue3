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
        <el-form-item label="手机号">
          <el-input v-model="searchParams.mobile" placeholder="请输入手机号" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="searchParams.status"
            placeholder="请选择状态"
            clearable
            style="width: 100px"
          >
            <el-option label="启用" :value="0" />
            <el-option label="禁用" :value="1" />
          </el-select>
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
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 0"
              @update:model-value="(val) => handleStatusChange(row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column
          prop="createTime"
          label="创建时间"
          width="180"
          :formatter="dateFormatter"
        />
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

      <!-- 新增/编辑对话框 -->
      <el-dialog
        v-model="dialogVisible"
        :title="dialogTitle"
        width="500px"
        @close="handleDialogClose"
      >
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
          <el-form-item label="状态" prop="status">
            <el-radio-group v-model="formData.status">
              <el-radio :label="0">启用</el-radio>
              <el-radio :label="1">禁用</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item v-if="dialogType === 'add'" label="密码" prop="password">
            <el-input v-model="formData.password" type="password" show-password />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
        </template>
      </el-dialog>

      <!-- 重置密码对话框 -->
      <el-dialog v-model="pwdDialogVisible" title="重置密码" width="400px">
        <el-form :model="pwdForm" :rules="pwdRules" ref="pwdFormRef" label-width="100px">
          <el-form-item label="新密码" prop="password">
            <el-input v-model="pwdForm.password" type="password" show-password />
          </el-form-item>
          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input v-model="pwdForm.confirmPassword" type="password" show-password />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="pwdDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="pwdLoading" @click="handleSubmitPwd">确定</el-button>
        </template>
      </el-dialog>
    </div>
  </ContentWrap>
</template>

<script setup lang="ts">
import { ContentWrap } from '@/components/ContentWrap'
import Pagination from '@/components/Pagination/index.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getUserPage,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  updateUserStatus
} from '@/api/admin/user'
import type { UserVO, UserCreateReqVO, UserUpdateReqVO } from '@/api/admin/user'
import { formatDate } from '@/utils/formatTime'

defineOptions({ name: 'UserManagement' })

// ============ 响应式数据 ============
const loading = ref(false)
const submitLoading = ref(false)
const pwdLoading = ref(false)
const userList = ref<UserVO[]>([])
const total = ref(0)

const searchParams = reactive({
  username: '',
  nickname: '',
  mobile: '',
  status: undefined as number | undefined
})

const queryParams = reactive({
  pageNo: 1,
  pageSize: 10
})

const dialogVisible = ref(false)
const dialogTitle = ref('')
const dialogType = ref<'add' | 'edit'>('add')
const formRef = ref()
const pwdFormRef = ref()

// 表单数据 - 状态：0=启用，1=禁用（后端标准）
const formData = reactive({
  id: 0,
  username: '',
  nickname: '',
  email: '',
  mobile: '',
  password: '',
  status: 0
})

const pwdDialogVisible = ref(false)
const currentUser = ref<UserVO | null>(null)
const pwdForm = reactive({
  password: '',
  confirmPassword: ''
})

// ============ 表单验证规则 ============
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  // ✅ 修复：昵称 不必须
  nickname: [{ min: 0, max: 20, message: '长度不能超过 20 个字符', trigger: 'blur' }],
  email: [
    {
      type: 'email',
      message: '请输入正确的邮箱地址',
      trigger: 'blur'
    }
  ],
  mobile: [
    {
      pattern: /^1[3-9]\d{9}$/,
      message: '请输入正确的手机号',
      trigger: 'blur'
    }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ]
}

const pwdRules = {
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: Function) => {
        if (value !== pwdForm.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// ============ 工具函数 ============
const dateFormatter = (_row: any, _column: any, cellValue: string) => {
  return formatDate(cellValue)
}

// ============ API 请求函数 ============
// 获取用户列表
const getList = async () => {
  loading.value = true
  try {
    const params: any = {
      pageNo: queryParams.pageNo,
      pageSize: queryParams.pageSize
    }
    if (searchParams.username) params.username = searchParams.username
    if (searchParams.nickname) params.nickname = searchParams.nickname
    if (searchParams.mobile) params.mobile = searchParams.mobile
    if (searchParams.status !== undefined) params.status = searchParams.status

    const res = await getUserPage(params)

    userList.value = res?.list || []
    total.value = res?.total || 0
  } catch (error) {
    console.error('获取用户列表失败:', error)
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

// ============ 搜索/重置 ============
const handleSearch = () => {
  queryParams.pageNo = 1
  getList()
}

const resetSearch = () => {
  searchParams.username = ''
  searchParams.nickname = ''
  searchParams.mobile = ''
  searchParams.status = undefined
  handleSearch()
}

// ============ 新增/编辑 ============
const handleAdd = () => {
  dialogType.value = 'add'
  dialogTitle.value = '新增用户'
  Object.assign(formData, {
    id: 0,
    username: '',
    nickname: '',
    email: '',
    mobile: '',
    password: '',
    status: 0
  })
  dialogVisible.value = true
}

const handleEdit = (row: UserVO) => {
  dialogType.value = 'edit'
  dialogTitle.value = '编辑用户'
  const statusValue = typeof row.status === 'number' ? row.status : Number(row.status)
  Object.assign(formData, {
    id: row.id,
    username: row.username,
    nickname: row.nickname || '',
    email: row.email || '',
    mobile: row.mobile || '',
    status: statusValue,
    password: ''
  })
  dialogVisible.value = true
}

const handleDialogClose = () => {
  formRef.value?.resetFields()
}

// ============ 删除用户 ============
const handleDelete = (row: UserVO) => {
  ElMessageBox.confirm(`确定要删除用户 "${row.username}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(async () => {
      try {
        const res = await deleteUser(row.id)
        if (res === true) {
          ElMessage.success('删除成功')
          getList()
        } else {
          ElMessage.error('删除失败')
        }
      } catch (error) {
        console.error('删除失败:', error)
        ElMessage.error('删除失败')
      }
    })
    .catch(() => {})
}

// ============ 修改状态 ============
const handleStatusChange = async (row: UserVO, value: boolean) => {
  const originalStatus = row.status
  const newStatus = value ? 0 : 1

  row.status = newStatus as any

  try {
    const res = await updateUserStatus({
      id: row.id,
      status: newStatus
    })
    if (res !== true) {
      row.status = originalStatus
      ElMessage.error('状态修改失败')
    } else {
      ElMessage.success(value ? '用户已启用' : '用户已禁用')
    }
  } catch (error) {
    row.status = originalStatus
    ElMessage.error('状态修改失败')
  }
}

// ============ 重置密码 ============
const handleResetPwd = (row: UserVO) => {
  currentUser.value = row
  pwdForm.password = ''
  pwdForm.confirmPassword = ''
  pwdDialogVisible.value = true
}

const handleSubmitPwd = async () => {
  try {
    await pwdFormRef.value?.validate()
  } catch {
    return
  }

  pwdLoading.value = true

  try {
    if (!currentUser.value) return

    const res = await resetUserPassword({
      id: currentUser.value.id,
      password: pwdForm.password
    })

    if (res === true) {
      ElMessage.success('密码重置成功')
      pwdDialogVisible.value = false
    } else {
      ElMessage.error('密码重置失败')
    }
  } catch (error) {
    console.error('密码重置失败:', error)
    ElMessage.error('密码重置失败')
  } finally {
    pwdLoading.value = false
  }
}

// ============ 提交表单 ============
const handleSubmit = async () => {
  // 表单验证
  try {
    await formRef.value?.validate()
  } catch (e) {
    console.log('表单验证失败', e)
    return
  }

  submitLoading.value = true

  try {
    if (dialogType.value === 'add') {
      // 新增：传用户名
      const createData = {
        username: formData.username,
        nickname: formData.nickname,
        email: formData.email || undefined,
        mobile: formData.mobile || undefined,
        password: formData.password,
        status: formData.status
      }
      const res = await createUser(createData)
      if (res) {
        ElMessage.success('新增成功')
        dialogVisible.value = false
        getList()
      } else {
        ElMessage.error('新增失败')
      }
    } else {
      const updateData = {
        id: formData.id,
        nickname: formData.nickname,
        email: formData.email || undefined,
        mobile: formData.mobile || undefined,
        status: formData.status
      }
      const res = await updateUser(updateData)
      if (res === true) {
        ElMessage.success('更新成功')
        dialogVisible.value = false
        getList()
      } else {
        ElMessage.error('更新失败')
      }
    }
  } catch (error: any) {
    console.error('提交失败:', error)
    ElMessage.error('操作失败：' + (error?.msg || '系统异常'))
  } finally {
    submitLoading.value = false
  }
}

// ============ 生命周期 ============
onMounted(() => {
  getList()
})
</script>

<style lang="scss" scoped>
.user-management {
  .search-form {
    margin-bottom: 20px;
  }
}
</style>
