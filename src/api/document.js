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
 * @param {string|null} selectedFeatureName 用户主动选择的功能名;为空则后端自动识别
 * @param {object} extraBody 额外字段(可选), 用于扩展协议字段. 当前支持: regenerateFromMessageId
 */
export function chatStreamSSE(sessionId, message, imageUrls, { onMeta, onToken, onDone, onError }, selectedFeatureName = null, extraBody = {}) {
  const token = localStorage.getItem('token')
  const controller = new AbortController()

  fetch('/api/graph/chat-stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ sessionId, message, imageUrls: imageUrls || [], selectedFeatureName, ...extraBody }),
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

        // SSE 按"空行"(\n\n) 分割事件,不是按 \n 切行
        // 这样 token 内的 \n 字符就不会被错误切割
        let eventBoundary
        while ((eventBoundary = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.substring(0, eventBoundary)
          buffer = buffer.substring(eventBoundary + 2)

          parseAndDispatchSseEvent(rawEvent, { onMeta, onToken, onDone, onError })
        }
      }
      // 处理可能剩余的最后一个事件 (流结束未带空行)
      if (buffer.trim()) {
        parseAndDispatchSseEvent(buffer, { onMeta, onToken, onDone, onError })
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError?.(err.message || '网络错误')
      }
    })

  return { abort: () => controller.abort() }
}

/**
 * 解析单个 SSE 事件块. (B5: 导出供 submitTicketForMessageSSE 复用)
 *
 * 一个事件块格式:
 *   event:eventName
 *   data:第一行
 *   data:第二行
 *
 * 多行 data 需要拼接 (中间用 \n);单行 data 直接用.
 */
export function parseAndDispatchSseEvent(rawEvent, { onMeta, onToken, onDone, onError }) {
  let eventName = ''
  const dataLines = []

  for (const line of rawEvent.split('\n')) {
    if (line.startsWith('event:')) {
      eventName = line.substring(6).trim()
    } else if (line.startsWith('data:')) {
      // 只去掉 "data:" 前缀,**不去前导空格**;保留 token 原始内容
      // SSE 规范允许 "data: xxx" 写法时去一个空格,但服务端
      // SseEmitter.event().data(...) 不会自带空格,这里保险按"是否首字符是空格"判断
      let dataContent = line.substring(5)
      if (dataContent.startsWith(' ')) dataContent = dataContent.substring(1)
      dataLines.push(dataContent)
    }
  }

  if (!eventName || dataLines.length === 0) return

  // 多行 data 用 \n 连接 (SSE 规范)
  const data = dataLines.join('\n')

  if (eventName === 'meta') {
    try { onMeta?.(JSON.parse(data)) } catch (e) { /* ignore */ }
  } else if (eventName === 'token') {
    onToken?.(data)
  } else if (eventName === 'done') {
    // done 事件可能携带 JSON 元数据 (如 assistantMessageId), 解析失败时降级为无参调用 (兼容旧协议)
    let doneMeta = null
    if (data && data.trim()) {
      try { doneMeta = JSON.parse(data) } catch (e) { /* ignore */ }
    }
    onDone?.(doneMeta)
  } else if (eventName === 'error') {
    onError?.(data)
  }
}

// ========== 反馈 ==========

/** 提交消息反馈（点赞/点踩） */
export function submitFeedback(data) {
  return request.post('/agent/feedback', data)
}

// ========== B5: 工单按钮 ==========

/**
 * 点击 AI 答复旁的"提交工单"按钮触发. 与 chatStreamSSE 同样是 SSE 流式响应,
 * 后端会插入伪 user 消息"提交工单", 完整跑一遍 Graph (含 ticket_agent 节点 → MCP → TicketSystem),
 * 流式输出 LLM 的"已为您提交工单 TK-..."答复.
 *
 * <p>关键区别于 chatStreamSSE 的两点:
 * <ul>
 *   <li>URL: {@code /api/agent/submit-ticket-for-message} (而非 chat-stream)</li>
 *   <li>Body: 只接受 {@code { targetAssistantMessageId }}, 不传 message/imageUrls 等</li>
 * </ul>
 *
 * <p>done 事件回调 doneMeta 在工单按钮场景额外带:
 * <ul>
 *   <li>{@code targetAssistantMessageId}: 老消息 id, 前端据此把那条消息标记为已提单</li>
 *   <li>{@code submittedTicketId}: 工单号 (TK-...) / null (失败, 按钮可重试)</li>
 *   <li>{@code assistantMessageId}: 本轮新 assistant 消息 id (LLM 的工单成功答复)</li>
 * </ul>
 *
 * @param targetAssistantMessageId 用户不满意的那条 AI 答复消息 id
 * @param callbacks  { onMeta, onToken, onDone, onError } — 跟 chatStreamSSE 同形
 * @return { abort } — 跟 chatStreamSSE 同形
 */
export function submitTicketForMessageSSE(targetAssistantMessageId, { onMeta, onToken, onDone, onError }) {
  const token = localStorage.getItem('token')
  const controller = new AbortController()

  fetch('/api/agent/submit-ticket-for-message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ targetAssistantMessageId }),
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

        let eventBoundary
        while ((eventBoundary = buffer.indexOf('\n\n')) !== -1) {
          const rawEvent = buffer.substring(0, eventBoundary)
          buffer = buffer.substring(eventBoundary + 2)
          parseAndDispatchSseEvent(rawEvent, { onMeta, onToken, onDone, onError })
        }
      }
      if (buffer.trim()) {
        parseAndDispatchSseEvent(buffer, { onMeta, onToken, onDone, onError })
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError?.(err.message || '网络错误')
      }
    })

  return { abort: () => controller.abort() }
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