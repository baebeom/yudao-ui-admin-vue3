<template>
  <div class="profile-container">
    <el-card class="profile-card">
      <el-tabs v-model="activeTab" stretch>
        <el-tab-pane label="个人信息" name="profile">
          <ProfileUser ref="profileUserRef" />
        </el-tab-pane>
        <el-tab-pane label="编辑资料" name="edit">
          <BasicInfo @success="handleEditSuccess" />
        </el-tab-pane>
        <el-tab-pane label="修改密码" name="password">
          <ResetPwd />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import ProfileUser from './components/ProfileUser.vue'
import BasicInfo from './components/BasicInfo.vue'
import ResetPwd from './components/ResetPwd.vue'

const activeTab = ref('profile')
const profileUserRef = ref()

const handleEditSuccess = () => {
  // 编辑资料保存后，刷新个人信息选项卡的内容
  profileUserRef.value?.refresh()
}
</script>

<style scoped>
.profile-container {
  max-width: 900px;
  margin: 20px auto;
  padding: 0 20px;
}
.profile-card {
  border-radius: 12px;
}
:deep(.el-tabs__header) {
  margin-bottom: 20px;
}
:deep(.el-tabs__item) {
  font-size: 16px;
  font-weight: 500;
}
</style>