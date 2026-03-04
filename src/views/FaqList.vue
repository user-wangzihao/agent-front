<template>
    <div class="page-container">
      <!-- 页头 -->
      <div class="page-header">
        <div class="page-title">FAQ 管理</div>
        <el-button type="primary" @click="openForm(null)">
          <el-icon><Plus /></el-icon> 新增 FAQ
        </el-button>
      </div>
  
      <!-- 搜索栏 -->
      <div class="search-bar">
        <el-input
          v-model="keyword"
          placeholder="搜索问题关键词..."
          style="width: 320px"
          clearable
          @keyup.enter="loadList"
          @clear="loadList"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" @click="loadList">搜索</el-button>
      </div>
  
      <!-- 列表 -->
      <el-table :data="list" v-loading="loading" style="width: 100%" row-key="id">
        <el-table-column label="问题" prop="question" min-width="280" show-overflow-tooltip />
        <el-table-column label="关联功能" prop="relatedFeatureName" width="160">
          <template #default="{ row }">
            <el-tag v-if="row.relatedFeatureName" type="info" size="small">{{ row.relatedFeatureName }}</el-tag>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="向量化" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.vectorized ? 'success' : 'warning'" size="small">
              {{ row.vectorized ? '已学习' : '未学习' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" prop="createTime" width="170" />
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openForm(row.id)">编辑</el-button>
            <el-button size="small" type="primary" @click="handleLearn(row)">
              {{ row.vectorized ? '重新学习' : '学习' }}
            </el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
  
      <!-- 分页 -->
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pageNum"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadList"
          @current-change="loadList"
        />
      </div>
  
      <!-- 新增/编辑弹窗 -->
      <FaqForm ref="faqFormRef" @success="loadList" />
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { Plus, Search } from '@element-plus/icons-vue'
  import { pageFaq, deleteFaq, learnFaq } from '@/api/faq'
  import FaqForm from './components/FaqForm.vue'
  
  const list = ref([])
  const loading = ref(false)
  const keyword = ref('')
  const pageNum = ref(1)
  const pageSize = ref(10)
  const total = ref(0)
  const faqFormRef = ref(null)
  
  onMounted(() => loadList())
  
  async function loadList() {
    loading.value = true
    try {
      const res = await pageFaq({ pageNum: pageNum.value, pageSize: pageSize.value, keyword: keyword.value })
      list.value = res.data.records || []
      total.value = res.data.total || 0
    } finally {
      loading.value = false
    }
  }
  
  function openForm(id) {
    faqFormRef.value.open(id)
  }
  
  async function handleLearn(row) {
    try {
      await ElMessageBox.confirm(
        row.vectorized ? `确定要对"${row.question.substring(0, 20)}..."重新学习吗？` : `确定要学习这条 FAQ 吗？`,
        '提示', { type: 'warning' }
      )
      await learnFaq(row.id)
      ElMessage.success('学习成功')
      loadList()
    } catch (e) {
      if (e !== 'cancel') ElMessage.error('学习失败: ' + e.message)
    }
  }
  
  async function handleDelete(row) {
    try {
      await ElMessageBox.confirm(`确定要删除这条 FAQ 吗？`, '提示', { type: 'warning' })
      await deleteFaq(row.id)
      ElMessage.success('删除成功')
      loadList()
    } catch (e) {
      if (e !== 'cancel') ElMessage.error('删除失败')
    }
  }
  </script>
  
  <style scoped>
  .page-container { padding: 24px; }
  .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .page-title { font-size: 20px; font-weight: 600; color: #303133; }
  .search-bar { display: flex; gap: 12px; margin-bottom: 16px; }
  .pagination-wrap { margin-top: 20px; display: flex; justify-content: flex-end; }
  .text-muted { color: #909399; font-size: 13px; }
  </style>