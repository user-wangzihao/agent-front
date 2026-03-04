<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <span class="login-icon">🤖</span>
        <h2>AgentDemo</h2>
        <p>智能技术支持平台</p>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" @keyup.enter="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="用户名" :prefix-icon="User" size="large" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码"
            :prefix-icon="Lock" size="large" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" :loading="loading" @click="handleLogin"
            style="width: 100%; background: #667eea; border-color: #667eea; height: 44px;">
            登 录
          </el-button>
        </el-form-item>
      </el-form>
      <div class="login-hint">
        <p>管理员：admin / admin123</p>
        <p>普通用户：user / user123</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '../api/document'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)

const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const handleLogin = async () => {
  await formRef.value.validate()
  loading.value = true
  try {
    const res = await login(form)
    const user = res.data
    localStorage.setItem('token', user.token)
    localStorage.setItem('user', JSON.stringify(user))
    ElMessage.success(`欢迎，${user.nickname}`)
    // 管理员跳转文档管理，普通用户跳转聊天
    router.push(user.role === 'admin' ? '/' : '/chat')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 380px;
  background: #fff;
  border-radius: 16px;
  padding: 40px 36px 28px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.login-header h2 {
  font-size: 24px;
  color: #303133;
  margin-bottom: 4px;
}

.login-header p {
  color: #909399;
  font-size: 14px;
}

.login-hint {
  text-align: center;
  margin-top: 16px;
  color: #c0c4cc;
  font-size: 12px;
  line-height: 1.8;
}
</style>
