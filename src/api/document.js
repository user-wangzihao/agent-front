import request from './request'

// ========== 认证相关 ==========

export function login(data) {
  return request.post('/auth/login', data)
}

// ========== 功能文档相关 ==========

/** 新增功能文档 */
export function addDocument(data) {
  return request.post('/document', data)
}

/** 更新功能文档 */
export function updateDocument(data) {
  return request.put('/document', data)
}

/** 根据ID查询功能文档 */
export function getDocumentById(id) {
  return request.get(`/document/${id}`)
}

/** 分页查询功能文档 */
export function pageDocument(data) {
  return request.post('/document/page', data)
}

/** 删除功能文档 */
export function deleteDocument(id) {
  return request.delete(`/document/${id}`)
}

// ========== 文件上传 ==========

/** 上传文件（返回url） */
export function uploadFile(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/file/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

// ========== Agent 相关 ==========

/** 学习功能文档（向量化入库） */
export function learnDocument(docId) {
  return request.post(`/agent/learn/${docId}`)
}

// ========== 会话相关 ==========

export function getSessionList() {
  return request.get('/session/list')
}

export function createSession() {
  return request.post('/session')
}

export function getSessionMessages(sessionId) {
  return request.get(`/session/${sessionId}/messages`)
}

export function deleteSession(sessionId) {
  return request.delete(`/session/${sessionId}`)
}

export function updateSessionTitle(sessionId, title) {
  return request.put(`/session/${sessionId}/title`, { title })
}

// ========== SSE 流式对话（支持多模态图片上传） ==========

/**
 * SSE 流式对话
 * @param {number|null} sessionId 会话ID
 * @param {string} message 用户消息
 * @param {string[]} imageUrls 用户上传的图片URL列表（可选）
 * @param {object} callbacks 回调函数
 */
export function chatStreamSSE(sessionId, message, imageUrls, { onMeta, onToken, onDone, onError }) {
  const token = localStorage.getItem('token')
  const controller = new AbortController()

  fetch('/api/agent/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ sessionId, message, imageUrls: imageUrls || [] }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        onError?.(`请求失败: ${response.status}`)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // 保留不完整的行

        let eventName = ''
        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventName = line.substring(6).trim()
          } else if (line.startsWith('data:')) {
            const data = line.substring(5)
            if (eventName === 'meta') {
              try { onMeta?.(JSON.parse(data)) } catch (e) { /* ignore */ }
            } else if (eventName === 'token') {
              onToken?.(data)
            } else if (eventName === 'done') {
              onDone?.()
            } else if (eventName === 'error') {
              onError?.(data)
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError?.(err.message || '网络错误')
      }
    })

  return { abort: () => controller.abort() }
}

// ========== 重新生成 ==========

/**
 * 重新生成某条 AI 回答（SSE 流式）
 * @param {number} messageId 要重新生成的 assistant 消息ID
 * @param {object} callbacks 回调函数
 */
export function regenerateSSE(messageId, { onMeta, onToken, onDone, onError }) {
  const token = localStorage.getItem('token')
  const controller = new AbortController()

  fetch(`/api/agent/chat/regenerate/${messageId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        onError?.(`请求失败: ${response.status}`)
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        let eventName = ''
        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventName = line.substring(6).trim()
          } else if (line.startsWith('data:')) {
            const data = line.substring(5)
            if (eventName === 'meta') {
              try { onMeta?.(JSON.parse(data)) } catch (e) { /* ignore */ }
            } else if (eventName === 'token') {
              onToken?.(data)
            } else if (eventName === 'done') {
              onDone?.()
            } else if (eventName === 'error') {
              onError?.(data)
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError?.(err.message || '网络错误')
      }
    })

  return { abort: () => controller.abort() }
}

// ========== 反馈 ==========

/** 提交消息反馈（点赞/点踩） */
export function submitFeedback(data) {
  return request.post('/agent/feedback', data)
}

// ========== 对话导出 ==========

/** 导出会话为 Markdown 文件 */
export function exportSession(sessionId) {
  const token = localStorage.getItem('token')
  return fetch(`/api/agent/export/${sessionId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })
    .then(async (response) => {
      if (!response.ok) throw new Error('导出失败')
      const text = await response.text()
      // 创建下载
      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `对话导出_${sessionId}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
}