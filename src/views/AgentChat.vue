<template>
  <div class="chat-layout">
    <!-- ========== 左侧侧边栏 ========== -->
    <div class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <span v-if="!sidebarCollapsed" class="sidebar-title">历史会话</span>
        <el-button :icon="sidebarCollapsed ? Expand : Fold" text @click="sidebarCollapsed = !sidebarCollapsed" style="color: #cdd6f4;" />
      </div>

      <el-button v-if="!sidebarCollapsed" :icon="Plus" class="new-chat-btn" @click="handleNewChat">
        新对话
      </el-button>

      <div v-if="!sidebarCollapsed" class="session-list">
        <div v-for="s in sessions" :key="s.id"
          class="session-item" :class="{ active: currentSessionId === s.id }"
          @click="loadSession(s.id)">
          <el-icon><ChatDotRound /></el-icon>
          <span class="session-title">{{ s.title || '新对话' }}</span>
          <el-icon class="session-delete" @click.stop="handleDeleteSession(s.id)"><Delete /></el-icon>
        </div>
      </div>

      <div v-if="!sidebarCollapsed" class="sidebar-footer">
        <div class="user-info">
          <span>{{ userInfo?.nickname || userInfo?.username }}</span>
          <el-tag size="small" :type="userInfo?.role === 'admin' ? 'danger' : 'info'">
            {{ userInfo?.role === 'admin' ? '管理员' : '用户' }}
          </el-tag>
        </div>
        <el-button text size="small" style="color: #cdd6f4;" @click="handleLogout">退出</el-button>
      </div>
    </div>

    <!-- ========== 右侧聊天区 ========== -->
    <div class="chat-main">
      <!-- 顶部工具栏 -->
      <div class="chat-toolbar">
        <div class="toolbar-left">
          <el-button text @click="$router.push('/')" style="font-size: 14px; color: #667eea;">
            📄 功能文档
          </el-button>
          <span class="toolbar-title">智能技术支持</span>
        </div>
        <div class="toolbar-actions">
          <el-button v-if="currentSessionId && messages.length > 0" text size="small" @click="handleExport">
            📥 导出对话
          </el-button>
        </div>
      </div>

      <!-- 消息列表 -->
      <div class="chat-messages" ref="messagesRef">
        <!-- 欢迎界面 -->
        <div v-if="messages.length === 0 && !isStreaming" class="welcome-message">
          <div class="welcome-icon">🤖</div>
          <h2>智能技术支持助手</h2>
          <p>描述你遇到的问题，我来帮你分析和解决。支持上传截图！</p>
          <div class="welcome-hints">
            <div v-for="(hint, i) in hints" :key="i" class="hint-item" @click="sendHint(hint)">
              💡 {{ hint }}
            </div>
          </div>
        </div>

        <!-- 消息列表 -->
        <div v-for="(msg, index) in messages" :key="index"
          class="message-row" :class="[msg.role === 'user' ? 'message-user' : 'message-agent']">
          <div class="message-avatar">{{ msg.role === 'user' ? '👤' : '🤖' }}</div>
          <div class="message-body">
            <!-- 用户上传的图片 -->
            <div v-if="msg.userImages?.length" class="message-user-images">
              <el-image v-for="(img, i) in msg.userImages" :key="i" :src="img"
                :preview-src-list="msg.userImages" :initial-index="i"
                style="width: 120px; height: 90px; border-radius: 6px;" fit="cover" />
            </div>

            <!-- 消息内容 (AI用Markdown渲染，用户纯文本) -->
            <div v-if="msg.role === 'assistant'" class="message-bubble markdown-body" v-html="renderMarkdown(msg.content)"></div>
            <div v-else class="message-bubble">{{ msg.content }}</div>

            <!-- 关联图片 -->
            <div v-if="msg.images?.length" class="message-images">
              <el-image v-for="(img, i) in msg.images" :key="i" :src="img"
                :preview-src-list="msg.images" :initial-index="i"
                style="width: 140px; height: 105px; border-radius: 6px;" fit="cover" />
            </div>

            <!-- 引用来源 -->
            <div v-if="msg.sources?.length" class="message-sources">
              <span class="source-label">📚 参考：</span>
              <el-tag v-for="(s, i) in msg.sources" :key="i" size="small" type="info"
                style="margin-right: 4px;">
                {{ s.featureName }} ({{ (s.score * 100).toFixed(0) }}%)
              </el-tag>
            </div>

            <!-- AI消息操作栏：复制 / 重新生成 / 反馈 -->
            <div v-if="msg.role === 'assistant' && !isStreaming" class="message-actions">
              <el-tooltip content="复制回答" placement="top">
                <el-button text size="small" @click="handleCopy(msg.content)">
                  📋 复制
                </el-button>
              </el-tooltip>
              <el-tooltip content="重新生成" placement="top">
                <el-button text size="small" @click="handleRegenerate(msg, index)">
                  🔄 重新生成
                </el-button>
              </el-tooltip>
              <span class="feedback-btns">
                <el-button text size="small"
                  :class="{ 'feedback-active': msg.feedbackRating === 1 }"
                  @click="handleFeedback(msg, index, 1)">
                  👍
                </el-button>
                <el-button text size="small"
                  :class="{ 'feedback-active': msg.feedbackRating === -1 }"
                  @click="handleFeedback(msg, index, -1)">
                  👎
                </el-button>
              </span>
            </div>
          </div>
        </div>

        <!-- 流式输出中 -->
        <div v-if="isStreaming" class="message-row message-agent">
          <div class="message-avatar">🤖</div>
          <div class="message-body">
            <div class="message-bubble markdown-body" v-html="renderMarkdown(streamingContent || '思考中...')"></div>
          </div>
        </div>
      </div>

      <!-- 图片预览区（上传的图片） -->
      <div v-if="uploadedImages.length > 0" class="upload-preview-bar">
        <div v-for="(img, i) in uploadedImages" :key="i" class="upload-preview-item">
          <el-image :src="img" style="width: 60px; height: 45px; border-radius: 4px;" fit="cover" />
          <el-icon class="upload-remove" @click="removeUploadedImage(i)"><Close /></el-icon>
        </div>
      </div>

      <!-- Feature 选择条（可选，留空则后端自动识别） -->
      <div class="feature-select-bar">
        <span class="feature-label">指定功能：</span>
        <el-select
          v-model="selectedFeatureName"
          placeholder="不指定 (由 AI 自动识别)"
          clearable
          filterable
          size="small"
          style="width: 240px;"
        >
          <el-option
            v-for="name in featureNames"
            :key="name"
            :label="name"
            :value="name"
          />
        </el-select>
        <span class="feature-hint">不确定就留空</span>
      </div>

      <!-- 输入区域 -->
      <div class="chat-input-area">
        <el-upload
          action="/api/file/upload"
          :headers="uploadHeaders"
          :show-file-list="false"
          accept="image/*"
          :on-success="handleImageUploadSuccess"
          :before-upload="beforeImageUpload"
          class="upload-btn"
        >
          <el-tooltip content="上传截图" placement="top">
            <el-button :icon="PictureFilled" circle />
          </el-tooltip>
        </el-upload>

        <el-input v-model="inputMessage" type="textarea" :rows="2" resize="none"
          placeholder="描述你遇到的问题，支持上传截图..."
          @keydown.enter.exact.prevent="handleSend" />

        <el-button type="primary" :icon="Promotion" :disabled="(!inputMessage.trim() && uploadedImages.length === 0) || isStreaming"
          @click="handleSend" class="send-btn">
          发送
        </el-button>
      </div>
    </div>

    <!-- ========== 反馈弹框 ========== -->
    <el-dialog v-model="feedbackDialogVisible" title="反馈原因" width="420px" :close-on-click-modal="false">
      <p style="margin-bottom: 12px; color: #606266;">请告诉我们回答哪里需要改进：</p>
      <div class="feedback-reasons">
        <el-tag v-for="reason in feedbackReasons" :key="reason"
          :effect="selectedFeedbackReason === reason ? 'dark' : 'plain'"
          :type="selectedFeedbackReason === reason ? 'danger' : 'info'"
          class="feedback-reason-tag"
          @click="selectedFeedbackReason = reason">
          {{ reason }}
        </el-tag>
      </div>
      <el-input v-model="customFeedbackReason" type="textarea" :rows="2" resize="none"
        placeholder="或者输入自定义原因..." style="margin-top: 12px;" />
      <template #footer>
        <el-button @click="feedbackDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmFeedback">提交反馈</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  getSessionList, createSession, getSessionMessages, deleteSession,
  chatStreamSSE, submitFeedback, exportSession,
  pageDocument
} from '../api/document'
import { ElMessage } from 'element-plus'
import { Plus, Fold, Expand, Delete, Promotion, ChatDotRound, PictureFilled, Close } from '@element-plus/icons-vue'

const router = useRouter()
const messagesRef = ref(null)
const inputMessage = ref('')
const isStreaming = ref(false)
const streamingContent = ref('')
const sidebarCollapsed = ref(false)
const currentSessionId = ref(null)
const sessions = ref([])
const messages = reactive([])
const uploadedImages = ref([]) // 用户上传待发送的图片
// Feature 选择
const selectedFeatureName = ref(null)
const featureNames = ref([])

// 反馈相关
const feedbackDialogVisible = ref(false)
const feedbackReasons = ['答案不正确', '答案不相关', '答案不完整', '答案太啰嗦', '格式混乱']
const selectedFeedbackReason = ref('')
const customFeedbackReason = ref('')
const pendingFeedbackMsg = ref(null)
const pendingFeedbackIndex = ref(null)

const userInfo = computed(() => {
  try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
})

// 上传请求头（模板中不能直接访问 localStorage，需要通过 computed 暴露）
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
}))

const hints = [
  '这个功能报错了怎么办？',
  '操作之后没有反应是什么原因？',
  '有没有替代方案可以实现这个需求？',
]

// ==================== Markdown 渲染增强 ====================

const renderMarkdown = (text) => {
  if (!text) return ''

  let html = text

  // 代码块（```language\ncode\n```）
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const escapedCode = escapeHtml(code.trim())
    const langLabel = lang ? `<span class="code-lang">${lang}</span>` : ''
    return `<div class="code-block">${langLabel}<pre><code>${escapedCode}</code></pre></div>`
  })

  // 行内代码
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')

  // 图片标记 [IMG:描述] → 从关联图片中匹配展示
  html = html.replace(/\[IMG:([^\]]+)\]/g, '<span class="img-placeholder" data-desc="$1">📷 $1</span>')

  // 标题 (### / ## / #)
  html = html.replace(/^### (.+)$/gm, '<h4 class="md-h4">$1</h4>')
  html = html.replace(/^## (.+)$/gm, '<h3 class="md-h3">$1</h3>')
  html = html.replace(/^# (.+)$/gm, '<h2 class="md-h2">$1</h2>')

  // 有序列表
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="md-ol-item" value="$1">$2</li>')
  // 将连续的 li 包裹在 ol 中
  html = html.replace(/((?:<li class="md-ol-item"[^>]*>.*?<\/li>\n?)+)/g, '<ol class="md-ol">$1</ol>')

  // 无序列表
  html = html.replace(/^[-*] (.+)$/gm, '<li class="md-ul-item">$1</li>')
  html = html.replace(/((?:<li class="md-ul-item">.*?<\/li>\n?)+)/g, '<ul class="md-ul">$1</ul>')

  // 表格
  html = html.replace(/^\|(.+)\|\s*\n\|[-:| ]+\|\s*\n((?:\|.+\|\s*\n?)+)/gm, (match, header, body) => {
    const headers = header.split('|').map(h => h.trim()).filter(Boolean)
    const rows = body.trim().split('\n').map(row =>
      row.split('|').map(cell => cell.trim()).filter(Boolean)
    )
    let table = '<table class="md-table"><thead><tr>'
    headers.forEach(h => { table += `<th>${h}</th>` })
    table += '</tr></thead><tbody>'
    rows.forEach(row => {
      table += '<tr>'
      row.forEach(cell => { table += `<td>${cell}</td>` })
      table += '</tr>'
    })
    table += '</tbody></table>'
    return table
  })

  // 加粗
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // 斜体
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // 分割线
  html = html.replace(/^---$/gm, '<hr class="md-hr" />')

  // 引用块
  html = html.replace(/^> (.+)$/gm, '<blockquote class="md-quote">$1</blockquote>')

  // 换行
  html = html.replace(/\n/g, '<br/>')

  // 清理多余 br（在块级元素前后）
  html = html.replace(/<br\/>\s*(<(?:ol|ul|table|h[2-4]|div|blockquote|hr))/g, '$1')
  html = html.replace(/<\/(?:ol|ul|table|h[2-4]|div|blockquote)>\s*<br\/>/g, (m) => m.replace('<br/>', ''))

  return html
}

const escapeHtml = (text) => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ==================== 会话管理 ====================

const loadSessions = async () => {
  try {
    const res = await getSessionList()
    sessions.value = res.data || []
  } catch (e) {
    console.error('加载会话列表失败', e)
  }
}

const loadSession = async (sessionId) => {
  currentSessionId.value = sessionId
  messages.length = 0
  try {
    const res = await getSessionMessages(sessionId)
    const list = res.data || []
    for (const m of list) {
      messages.push({
        id: m.id,
        role: m.role,
        content: m.content,
        images: m.relatedImages ? tryParse(m.relatedImages) : [],
        sources: m.sources ? tryParse(m.sources) : [],
        userImages: m.userImages ? tryParse(m.userImages) : [],
        feedbackRating: m.feedbackRating || null,
      })
    }
    scrollToBottom()
  } catch (e) {
    console.error('加载会话消息失败', e)
  }
}

const handleNewChat = () => {
  currentSessionId.value = null
  messages.length = 0
  uploadedImages.value = []
}

const handleDeleteSession = async (sessionId) => {
  await deleteSession(sessionId)
  if (currentSessionId.value === sessionId) {
    currentSessionId.value = null
    messages.length = 0
  }
  loadSessions()
}

const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}

const tryParse = (str) => {
  try { return JSON.parse(str) } catch { return [] }
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

// ==================== 图片上传 ====================

const beforeImageUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isImage) {
    ElMessage.error('只能上传图片文件')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB')
    return false
  }
  return true
}

const handleImageUploadSuccess = (res) => {
  if (res.code === 200 && res.data) {
    uploadedImages.value.push(res.data)
    ElMessage.success('截图已上传')
  } else {
    ElMessage.error('上传失败')
  }
}

const removeUploadedImage = (index) => {
  uploadedImages.value.splice(index, 1)
}

// ==================== 发送消息（SSE 流式） ====================

const sendHint = (hint) => {
  inputMessage.value = hint
  handleSend()
}

const handleSend = () => {
  const msg = inputMessage.value.trim()
  const imgs = [...uploadedImages.value]

  if (!msg && imgs.length === 0) return
  if (isStreaming.value) return

  // 添加用户消息（含上传的图片）
  messages.push({
    role: 'user',
    content: msg || '(请看截图)',
    userImages: imgs,
  })
  inputMessage.value = ''
  uploadedImages.value = []
  isStreaming.value = true
  streamingContent.value = ''
  scrollToBottom()

  let metaData = null

  chatStreamSSE(currentSessionId.value, msg || '请分析我上传的截图', imgs, {
    onMeta: (meta) => {
      metaData = meta
      if (!currentSessionId.value) {
        currentSessionId.value = meta.sessionId
      }
    },
    onToken: (delta) => {
      streamingContent.value += delta
      scrollToBottom()
    },
    onDone: (doneMeta) => {
      messages.push({
        id: doneMeta?.assistantMessageId || null,
        role: 'assistant',
        content: streamingContent.value,
        images: metaData?.relatedImages || [],
        sources: metaData?.sources || [],
        feedbackRating: null,
      })
      isStreaming.value = false
      streamingContent.value = ''
      loadSessions()
      scrollToBottom()
    },
    onError: (err) => {
      messages.push({ role: 'assistant', content: '抱歉，出了点问题：' + (err || '未知错误') })
      isStreaming.value = false
      streamingContent.value = ''
    },
  }, selectedFeatureName.value)
}

// ==================== 消息复制 ====================

const handleCopy = async (content) => {
  try {
    await navigator.clipboard.writeText(content)
    ElMessage.success('已复制到剪贴板')
  } catch (e) {
    // fallback
    const textarea = document.createElement('textarea')
    textarea.value = content
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    ElMessage.success('已复制到剪贴板')
  }
}

// ==================== 重新生成 ====================
//
// 第六刀 Batch 4-4: regenerate 已统一到主链路 Graph SSE,
// 通过给 /api/graph/chat-stream 带 regenerateFromMessageId 字段触发.
// 后端会反查上一条 user 消息 + 物理删除老 assistant + 跑 Graph + 落库新 assistant.
// 前端不再单独调 /api/agent/chat/regenerate.

const handleRegenerate = (msg, index) => {
  if (isStreaming.value) return

  // 有 messageId(从 DB 加载或刚生成时 done.data 带回的): 调后端 regenerate
  if (msg.id) {
    isStreaming.value = true
    streamingContent.value = ''
    // 先从前端列表中乐观移除该条 assistant 消息 (后端那边也会物理删, 保持一致)
    messages.splice(index, 1)
    scrollToBottom()

    let metaData = null

    chatStreamSSE(currentSessionId.value, null, null, {
      onMeta: (meta) => { metaData = meta },
      onToken: (delta) => {
        streamingContent.value += delta
        scrollToBottom()
      },
      onDone: (doneMeta) => {
        messages.push({
          id: doneMeta?.assistantMessageId || null,
          role: 'assistant',
          content: streamingContent.value,
          images: metaData?.relatedImages || [],
          sources: metaData?.sources || [],
          feedbackRating: null,
        })
        isStreaming.value = false
        streamingContent.value = ''
        scrollToBottom()
      },
      onError: (err) => {
        messages.push({ role: 'assistant', content: '重新生成失败：' + (err || '未知错误') })
        isStreaming.value = false
        streamingContent.value = ''
      },
    }, null, { regenerateFromMessageId: msg.id })
  } else {
    // 兜底: 极端情况 msg.id 缺失时, 退化为本地"清空 + 重发"
    // 触发条件: done 事件因网络异常没带回 id (Batch 4-3 hotfix 后此分支应几乎不进入)
    const userMsgIndex = index - 1
    if (userMsgIndex >= 0 && messages[userMsgIndex].role === 'user') {
      messages.splice(index, 1)
      inputMessage.value = messages[userMsgIndex].content
      messages.splice(userMsgIndex, 1)
      handleSend()
    }
  }
}

// ==================== 反馈系统 ====================

const handleFeedback = (msg, index, rating) => {
  // 点赞：直接提交
  if (rating === 1) {
    msg.feedbackRating = 1
    if (msg.id) {
      submitFeedback({ messageId: msg.id, rating: 1 }).catch(() => {})
    }
    ElMessage.success('感谢您的反馈！')
    return
  }

  // 点踩：弹出反馈原因弹框
  pendingFeedbackMsg.value = msg
  pendingFeedbackIndex.value = index
  selectedFeedbackReason.value = ''
  customFeedbackReason.value = ''
  feedbackDialogVisible.value = true
}

const confirmFeedback = () => {
  const reason = customFeedbackReason.value.trim() || selectedFeedbackReason.value
  const msg = pendingFeedbackMsg.value

  if (msg) {
    msg.feedbackRating = -1
    if (msg.id) {
      submitFeedback({ messageId: msg.id, rating: -1, reason }).catch(() => {})
    }
  }

  feedbackDialogVisible.value = false
  ElMessage.success('反馈已提交，我们会持续改进')
}

// ==================== 对话导出 ====================

const handleExport = async () => {
  if (!currentSessionId.value) return
  try {
    await exportSession(currentSessionId.value)
    ElMessage.success('对话已导出')
  } catch (e) {
    ElMessage.error('导出失败')
  }
}

// ==================== 初始化 ====================

const loadFeatureNames = async () => {
  try {
    // 复用已有 pageDocument 接口拉一次,把 pageSize 调大避免分页
    const res = await pageDocument({ pageNum: 1, pageSize: 1000 })
    const list = res.data?.records || res.data?.list || []
    const names = [...new Set(list.map(d => d.featureName).filter(Boolean))]
    featureNames.value = names
  } catch (e) {
    console.error('加载功能列表失败', e)
    // 失败不影响聊天功能,下拉为空即可
  }
}

onMounted(() => {
  loadSessions()
  loadFeatureNames()
})
</script>

<style scoped>
.chat-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: #f0f2f5;
}

/* ========== 侧边栏 ========== */
.sidebar {
  width: 280px;
  background: #1e1e2e;
  color: #cdd6f4;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  flex-shrink: 0;
}

.sidebar.collapsed {
  width: 50px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #313244;
}

.sidebar-title {
  font-size: 16px;
  font-weight: 600;
}

.new-chat-btn {
  margin: 12px 16px;
  background: #313244;
  color: #cdd6f4;
  border: 1px dashed #585b70;
}

.new-chat-btn:hover {
  background: #45475a;
  border-color: #89b4fa;
  color: #89b4fa;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 2px;
  transition: background 0.2s;
}

.session-item:hover {
  background: #313244;
}

.session-item.active {
  background: #45475a;
}

.session-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.session-delete {
  opacity: 0;
  transition: opacity 0.2s;
  color: #f38ba8;
}

.session-item:hover .session-delete {
  opacity: 1;
}

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid #313244;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

/* ========== 聊天主区域 ========== */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
}

.toolbar-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* ========== 欢迎界面 ========== */
.welcome-message {
  text-align: center;
  padding: 60px 20px;
  color: #606266;
}

.welcome-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.welcome-message h2 {
  font-size: 20px;
  color: #303133;
  margin-bottom: 8px;
}

.welcome-message p {
  color: #909399;
  margin-bottom: 32px;
}

.welcome-hints {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.hint-item {
  padding: 10px 20px;
  background: #f5f7ff;
  border: 1px solid #e4e7ff;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
  color: #667eea;
}

.hint-item:hover {
  background: #667eea;
  color: #fff;
  border-color: #667eea;
}

/* ========== 消息行 ========== */
.message-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  max-width: 85%;
}

.message-user {
  margin-left: auto;
  flex-direction: row-reverse;
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  background: #f0f2f5;
}

.message-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.7;
  font-size: 14px;
  word-break: break-word;
}

.message-user .message-bubble {
  background: #667eea;
  color: #fff;
  border-top-right-radius: 4px;
}

.message-agent .message-bubble {
  background: #fff;
  color: #303133;
  border-top-left-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

/* ========== Markdown 渲染样式 ========== */
.markdown-body :deep(.md-h2) {
  font-size: 18px;
  font-weight: 700;
  margin: 16px 0 8px;
  color: #1a1a2e;
}

.markdown-body :deep(.md-h3) {
  font-size: 16px;
  font-weight: 600;
  margin: 14px 0 6px;
  color: #1a1a2e;
}

.markdown-body :deep(.md-h4) {
  font-size: 15px;
  font-weight: 600;
  margin: 12px 0 6px;
  color: #303133;
}

.markdown-body :deep(.md-ol),
.markdown-body :deep(.md-ul) {
  padding-left: 20px;
  margin: 8px 0;
}

.markdown-body :deep(.md-ol-item),
.markdown-body :deep(.md-ul-item) {
  margin-bottom: 4px;
  line-height: 1.7;
}

.markdown-body :deep(.code-block) {
  position: relative;
  margin: 10px 0;
  border-radius: 8px;
  overflow: hidden;
}

.markdown-body :deep(.code-lang) {
  position: absolute;
  top: 6px;
  right: 10px;
  font-size: 11px;
  color: #6e7681;
  background: rgba(255, 255, 255, 0.1);
  padding: 1px 6px;
  border-radius: 4px;
}

.markdown-body :deep(pre) {
  background: #1e1e2e;
  color: #cdd6f4;
  padding: 14px 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.markdown-body :deep(code) {
  font-family: 'Menlo', 'Consolas', 'Monaco', monospace;
}

.markdown-body :deep(.inline-code) {
  background: #f0f2f5;
  color: #c7254e;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
}

.markdown-body :deep(.md-table) {
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0;
  font-size: 13px;
}

.markdown-body :deep(.md-table th),
.markdown-body :deep(.md-table td) {
  border: 1px solid #e4e7ed;
  padding: 8px 12px;
  text-align: left;
}

.markdown-body :deep(.md-table th) {
  background: #f5f7fa;
  font-weight: 600;
}

.markdown-body :deep(.md-quote) {
  border-left: 4px solid #667eea;
  padding: 8px 16px;
  margin: 8px 0;
  background: #f5f7ff;
  color: #606266;
  border-radius: 0 4px 4px 0;
}

.markdown-body :deep(.md-hr) {
  border: none;
  border-top: 1px solid #e4e7ed;
  margin: 16px 0;
}

.markdown-body :deep(strong) {
  font-weight: 700;
  color: #1a1a2e;
}

.markdown-body :deep(.img-placeholder) {
  display: inline-block;
  background: #e8f0fe;
  color: #667eea;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: default;
  margin: 2px 0;
}

/* ========== 用户上传的图片 ========== */
.message-user-images {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

/* ========== 关联图片 ========== */
.message-images {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

/* ========== 引用来源 ========== */
.message-sources {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.source-label {
  font-size: 12px;
  color: #909399;
  margin-right: 6px;
}

/* ========== 消息操作栏 ========== */
.message-actions {
  display: flex;
  gap: 4px;
  margin-top: 6px;
  opacity: 0;
  transition: opacity 0.2s;
}

.message-row:hover .message-actions {
  opacity: 1;
}

.message-actions .el-button {
  font-size: 12px;
  color: #909399;
  padding: 2px 6px;
}

.message-actions .el-button:hover {
  color: #667eea;
}

.feedback-btns {
  display: flex;
  gap: 0;
  margin-left: 4px;
}

.feedback-active {
  color: #667eea !important;
  font-weight: bold;
}

/* ========== 图片上传预览条 ========== */
.upload-preview-bar {
  display: flex;
  gap: 8px;
  padding: 8px 24px;
  background: #fafafa;
  border-top: 1px solid #ebeef5;
}

.upload-preview-item {
  position: relative;
}

.upload-remove {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #f56c6c;
  color: #fff;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ========== 输入区域 ========== */
.chat-input-area {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #ebeef5;
  background: #fff;
  align-items: flex-end;
}

.chat-input-area :deep(.el-textarea__inner) {
  border-radius: 8px;
  font-size: 14px;
}

.upload-btn {
  flex-shrink: 0;
}

.send-btn {
  height: 54px;
  min-width: 80px;
  border-radius: 8px;
  background: #667eea;
  border-color: #667eea;
}

/* ========== 反馈弹框 ========== */
.feedback-reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.feedback-reason-tag {
  cursor: pointer;
  transition: all 0.2s;
}

.feedback-reason-tag:hover {
  transform: scale(1.05);
}

/* ========== 流式输出动画 ========== */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 16px 20px !important;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #909399;
  border-radius: 50%;
  animation: typing 1.4s infinite both;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* ========== Feature 选择条 ========== */
.feature-select-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 24px;
  background: #fafafa;
  border-top: 1px solid #ebeef5;
}

.feature-label {
  font-size: 13px;
  color: #606266;
}

.feature-hint {
  font-size: 12px;
  color: #909399;
  margin-left: auto;
}
</style>