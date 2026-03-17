<template>
  <div class="app-container">
    <div class="page-header">
      <h1>📄 功能文档管理</h1>
      <div>
        <el-button @click="$router.push('/chat')" style="background:rgba(255,255,255,0.2);border-color:rgba(255,255,255,0.4);color:#fff;margin-right:8px;">🤖 智能助手</el-button>
        <el-button type="primary" :icon="Plus" @click="$router.push('/document/add')" style="background:rgba(255,255,255,0.2);border-color:rgba(255,255,255,0.4);">新增文档</el-button>
        <el-button @click="handleLogout" style="background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.3);color:#fff;margin-left:8px;">退出</el-button>
      </div>
    </div>
    <div class="content-card">
      <el-row :gutter="16" align="middle">
        <el-col :span="8">
          <el-input v-model="searchForm.keyword" placeholder="按功能名称搜索..." clearable :prefix-icon="Search" @keyup.enter="handleSearch" />
        </el-col>
        <el-col :span="4">
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-col>
      </el-row>
    </div>
    <div class="content-card">
      <el-table :data="tableData" v-loading="loading" stripe style="width:100%" :header-cell-style="{background:'#fafbfc',color:'#606266',fontWeight:600}">
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="featureName" label="功能名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="englishName" label="英文名" min-width="140" show-overflow-tooltip />
        <el-table-column prop="author" label="编制人" width="100" align="center" />
        <el-table-column prop="version" label="版本" width="100" align="center" />
        <el-table-column prop="company" label="所属公司" width="140" show-overflow-tooltip />
        <el-table-column label="学习状态" width="100" align="center">
          <template #default="{row}">
            <el-tag :type="row.vectorized===1?'success':'info'" size="small">{{row.vectorized===1?'已学习':'未学习'}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="视频学习" width="110" align="center">
          <template #default="{row}">
            <el-tag v-if="getVideoLearnStatus(row.id) === 'none'" size="small" type="info">无视频</el-tag>
            <el-tag v-else-if="getVideoLearnStatus(row.id) === 'not_learned'" size="small" type="warning">未学习</el-tag>
            <el-tag v-else-if="getVideoLearnStatus(row.id) === 'learning'" size="small" type="" class="learning-tag">
              <el-icon class="is-loading"><Loading /></el-icon> 学习中
            </el-tag>
            <el-tag v-else-if="getVideoLearnStatus(row.id) === 'learned'" size="small" type="success">已学习</el-tag>
            <el-tag v-else-if="getVideoLearnStatus(row.id) === 'partial'" size="small" type="warning">部分完成</el-tag>
            <el-tag v-else-if="getVideoLearnStatus(row.id) === 'failed'" size="small" type="danger">学习失败</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" align="center" />
        <el-table-column label="操作" width="300" align="center" fixed="right">
          <template #default="{row}">
            <el-button type="success" link @click="handleLearn(row)">🧠 {{row.vectorized===1?'重新学习':'学习'}}</el-button>
            <el-button type="primary" link @click="handleLearnVideo(row)"> 🎬 学习视频 </el-button>
            <el-button type="primary" link :icon="View" @click="$router.push(`/document/detail/${row.id}`)">查看</el-button>
            <el-button type="warning" link :icon="Edit" @click="$router.push(`/document/edit/${row.id}`)">编辑</el-button>
            <el-popconfirm title="确定删除该文档吗？" @confirm="handleDelete(row.id)">
              <template #reference><el-button type="danger" link :icon="Delete">删除</el-button></template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
      <div style="display:flex;justify-content:flex-end;margin-top:20px;">
        <el-pagination v-model:current-page="searchForm.pageNum" v-model:page-size="searchForm.pageSize" :page-sizes="[10,20,50]" :total="total" layout="total,sizes,prev,pager,next,jumper" @size-change="loadData" @current-change="loadData" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { pageDocument, deleteDocument, learnDocument } from '../api/document'
import { ElMessage, ElLoading } from 'element-plus'
import { Plus, Search, Refresh, View, Edit, Delete } from '@element-plus/icons-vue'
import { getVideoList, learnVideo } from '../api/video'
import { Loading } from '@element-plus/icons-vue'

const router = useRouter()
const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const searchForm = reactive({ pageNum: 1, pageSize: 10, keyword: '' })
// 存储每个文档关联的视频列表
const videoStatusMap = ref({})

const loadData = async () => {
  loading.value = true
  try {
    const res = await pageDocument(searchForm)
    tableData.value = res.data.records
    total.value = Number(res.data.total)
    loadVideoStatus() // 加载视频状态
  } finally { loading.value = false }
}
const handleSearch = () => { searchForm.pageNum = 1; loadData() }
const handleReset = () => { searchForm.keyword = ''; searchForm.pageNum = 1; loadData() }
const handleDelete = async (id) => { await deleteDocument(id); ElMessage.success('删除成功'); loadData() }
const handleLearn = async (row) => {
  const loadingInstance = ElLoading.service({
    text: `正在学习「${row.featureName}」，包含图片分析，请耐心等待...`,
    background: 'rgba(0, 0, 0, 0.75)',
  })

  // 动态更新提示文字，让用户知道系统还在工作
  const tips = [
    '正在解析文档结构...',
    '正在通过 AI 分析功能截图...',
    '图片较多时需要较长时间，请耐心等待...',
    '正在生成知识向量...',
    '即将完成，正在写入知识库...',
  ]
  let tipIndex = 0
  const tipTimer = setInterval(() => {
    tipIndex = Math.min(tipIndex + 1, tips.length - 1)
    loadingInstance.setText(`正在学习「${row.featureName}」\n${tips[tipIndex]}`)
  }, 8000)

  try {
    await learnDocument(row.id)
    ElMessage.success(`「${row.featureName}」学习完成！（含图片理解）`)
    loadData()
  } catch (e) {
    // error already handled by interceptor
  } finally {
    clearInterval(tipTimer)
    loadingInstance.close()
  }
}

// 加载所有文档的视频状态
const loadVideoStatus = async () => {
  for (const doc of tableData.value) {
    try {
      const res = await getVideoList(doc.id)
      videoStatusMap.value[doc.id] = res.data || []
    } catch (e) {
      videoStatusMap.value[doc.id] = []
    }
  }
}

// 获取某个文档的视频学习状态
const getVideoLearnStatus = (docId) => {
  const videos = videoStatusMap.value[docId]
  if (!videos || videos.length === 0) return 'none'

  const statuses = videos.map(v => v.learnStatus)
  if (statuses.every(s => s === 2)) return 'learned'
  if (statuses.some(s => s === 1)) return 'learning'
  if (statuses.some(s => s === 3) && statuses.some(s => s === 2)) return 'partial'
  if (statuses.every(s => s === 3)) return 'failed'
  return 'not_learned'
}

// 学习视频按钮的处理方法
const handleLearnVideo = async (row) => {
  // 先检查有没有视频
  const videos = videoStatusMap.value[row.id]
  if (!videos || videos.length === 0) {
    ElMessage.warning(`「${row.featureName}」没有关联视频，请先在编辑页面上传视频`)
    return
  }

  // 检查是否正在学习
  if (videos.some(v => v.learnStatus === 1)) {
    ElMessage.warning('视频正在学习中，请稍后')
    return
  }

  try {
    const res = await learnVideo(row.id)
    ElMessage.success(res.data || '视频学习任务已提交')
    // 刷新视频状态
    setTimeout(() => loadVideoStatus(), 1000)
    // 启动轮询，每5秒刷新一次视频状态，直到学习完成
    startVideoStatusPolling(row.id)
  } catch (e) {
    // error handled by interceptor
  }
}

// 轮询视频学习状态
let pollingTimer = null
const startVideoStatusPolling = (docId) => {
  // 清除之前的轮询
  if (pollingTimer) clearInterval(pollingTimer)

  pollingTimer = setInterval(async () => {
    try {
      const res = await getVideoList(docId)
      videoStatusMap.value[docId] = res.data || []

      // 检查是否全部完成（没有状态为1-学习中的了）
      const videos = res.data || []
      const stillLearning = videos.some(v => v.learnStatus === 1)
      if (!stillLearning) {
        clearInterval(pollingTimer)
        pollingTimer = null

        const allSuccess = videos.every(v => v.learnStatus === 2)
        if (allSuccess) {
          ElMessage.success('视频学习全部完成！')
        } else {
          ElMessage.warning('视频学习已完成，部分视频学习失败')
        }
      }
    } catch (e) {
      clearInterval(pollingTimer)
      pollingTimer = null
    }
  }, 5000) // 每5秒轮询一次
}

const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); router.push('/login') }
onMounted(() => { loadData() })
</script>

<style scoped>
.learning-tag .is-loading {
  margin-right: 4px;
}
</style>
