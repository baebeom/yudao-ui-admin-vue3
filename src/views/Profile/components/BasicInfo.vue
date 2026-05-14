<template>
  <Form ref="formRef" :labelWidth="200" :rules="rules" :schema="schema">
    <template #sex="form">
      <el-radio-group v-model="form['sex']">
        <el-radio :value="1">{{ t('profile.user.man') }}</el-radio>
        <el-radio :value="2">{{ t('profile.user.woman') }}</el-radio>
      </el-radio-group>
    </template>
  </Form>
  <div style="text-align: center">
    <XButton :title="t('common.save')" type="primary" @click="submit()" />
    <XButton :title="t('common.reset')" type="danger" @click="init()" />
  </div>
</template>

<script lang="ts" setup>
import type { FormRules } from 'element-plus'
import { FormSchema } from '@/types/form'
import type { FormExpose } from '@/components/Form'
import {
  getUserProfile,
  updateUserProfile,
  UserProfileUpdateReqVO
} from '@/api/system/user/profile'
import { useUserStore } from '@/store/modules/user'

defineOptions({ name: 'BasicInfo' })

const { t } = useI18n()
const message = useMessage()
const userStore = useUserStore()

// 定义事件
const emit = defineEmits<{
  (e: 'success'): void
}>()

// 表单校验
const rules = reactive<FormRules>({
  nickname: [{ required: true, message: t('profile.rules.nickname'), trigger: 'blur' }],
  mobile: [
    { required: true, message: t('profile.rules.phone'), trigger: 'blur' },
    {
      pattern: /^1[3-9]\d{9}$/,
      message: t('profile.rules.truephone'),
      trigger: 'blur'
    }
  ],
  email: [
    { required: false, message: t('profile.rules.mail'), trigger: 'blur' },
    {
      type: 'email',
      message: t('profile.rules.truemail'),
      trigger: ['blur', 'change']
    }
  ]
})

const schema = reactive<FormSchema[]>([
  {
    field: 'username',
    label: '登录账号',
    component: 'Input',
    componentProps: {
      disabled: true
    }
  },
  {
    field: 'nickname',
    label: '用户昵称',
    component: 'Input'
  },
  {
    field: 'mobile',
    label: '手机号码',
    component: 'Input'
  },
  {
    field: 'email',
    label: '电子邮箱',
    component: 'Input'
  }
])

const formRef = ref<FormExpose>()

// 监听 userStore 中头像的变化，同步更新表单数据
watch(
  () => userStore.getUser.avatar,
  (newAvatar) => {
    if (newAvatar && formRef.value) {
      const formModel = formRef.value.formModel
      if (formModel) {
        formModel.avatar = newAvatar
      }
    }
  }
)

const submit = () => {
  const elForm = unref(formRef)?.getElFormRef()
  if (!elForm) return
  elForm.validate(async (valid) => {
    if (valid) {
      const data = unref(formRef)?.formModel as UserProfileUpdateReqVO
      await updateUserProfile(data)
      message.success(t('common.updateSuccess'))
      const profile = await init()
      await userStore.setUserNicknameAction(profile.nickname)
      emit('success')
    }
  })
}

const init = async () => {
  const res = await getUserProfile()
  unref(formRef)?.setValues(res)
  return res
}

onMounted(async () => {
  await init()
})
</script>