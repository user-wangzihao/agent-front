<template>
  <div class="page-container">
    <!-- 页头 -->
    <div class="page-header">
      <div class="page-title">FAQ 候选审核</div>
      <div class="page-subtitle">
        来自工单系统的 FAQ 候选,审核通过后将自动学习入库
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="search-bar">
      <el-radio-group v-model="reviewStatus" @change="onStatusChange">
        <el-radio-button label="">全部</el-radio-button>
        <el-radio-button label="PENDING">待审核</el-radio-button>
        <el-radio-button label="LEARNED">已学习</el-radio-button>
        <el-radio-button label="REJECTED">已拒绝</el-radio-button>
      </el-radio-group>
      <el-button @click="loadList" :icon="Refresh">刷新</el-button>
    </div>

    <!-- 列表 -->
    <el-table :data="list" v-loading="loading" style="width: 100%" row-key="id">
      <el-table-column label="问题" prop="question" min-width="280" show-overflow-tooltip />
      <el-table-column label="关联功能" prop="relatedFeatureName" width="140">
        <template #default="{ row }">
          <el-tag :type="row.relatedFeatureName === '通用FAQ' ? 'info' : 'primary'" size="small">
            {{ row.relatedFeatureName }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="来源工单" prop="sourceTicketNo" width="160" />
      <el-table-column label="提交人" prop="submittedByName" width="100" />
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.reviewStatus === 'PENDING'" type="warning" size="small">待审核</el-tag>
          <el-tag v-else-if="row.reviewStatus === 'LEARNED'" type="success" size="small">已学习</el-tag>
          <el-tag v-else-if="row.reviewStatus === 'REJECTED'" type="danger" size="small">已拒绝</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="提交时间" prop="createTime" width="170" />
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openDetail(row)">查看</el-button>
          <template v-if="row.reviewStatus === 'PENDING'">
            <el-button size="small" type="primary" @click="handleLearn(row)">学习</el-button>
            <el-button size="small" type="danger" @click="openRejectDialog(row)">拒绝</el-button>
          </template>
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

    <!-- 详情查看弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="候选详情"
      width="720px"
      :close-on-click-modal="false"
    >
      <div v-if="currentDetail" class="detail-block">
        <div class="detail-row">
          <div class="detail-label">关联功能</div>
          <el-tag :type="currentDetail.relatedFeatureName === '通用FAQ' ? 'info' : 'primary'">
            {{ currentDetail.relatedFeatureName }}
          </el-tag>
          <span v-if="currentDetail.relatedFeatureId" class="text-muted" style="margin-left: 8px;">
            (feature_id: {{ currentDetail.relatedFeatureId }})
          </span>
        </div>

        <div class="detail-row">
          <div class="detail-label">问题</div>
          <div class="detail-content">{{ currentDetail.question }}</div>
          <div v-if="parsedImages(currentDetail.questionImages).length" class="image-row">
            <el-image
              v-for="(url, idx) in parsedImages(currentDetail.questionImages)"
              :key="idx"
              :src="url"
              :preview-src-list="parsedImages(currentDetail.questionImages)"
              :initial-index="idx"
              fit="cover"
              class="thumb"
            />
          </div>
        </div>

        <div class="detail-row">
          <div class="detail-label">答案</div>
          <div class="detail-content" style="white-space: pre-wrap;">{{ currentDetail.answer }}</div>
          <div v-if="parsedImages(currentDetail.answerImages).length" class="image-row">
            <el-image
              v-for="(url, idx) in parsedImages(currentDetail.answerImages)"
              :key="idx"
              :src="url"
              :preview-src-list="parsedImages(currentDetail.answerImages)"
              :initial-index="idx"
              fit="cover"
              class="thumb"
            />
          </div>
        </div>

        <div class="detail-row">
          <div class="detail-label">来源</div>
          <div class="detail-content">
            工单 <strong>{{ currentDetail.sourceTicketNo }}</strong> 
            · 提交人 <strong>{{ currentDetail.submittedByName }}</strong>
            · {{ currentDetail.createTime }}
          </div>
        </div>

        <div class="detail-row" v-if="currentDetail.reviewStatus !== 'PENDING'">
          <div class="detail-label">审核记录</div>
          <div class="detail-content">
            <el-tag v-if="currentDetail.reviewStatus === 'LEARNED'" type="success" size="small">
              已学习 → faq_id: {{ currentDetail.promotedFaqId }}
            </el-tag>
            <el-tag v-else type="danger" size="small">已拒绝</el-tag>
            <span style="margin-left: 8px;">
              审核人: {{ currentDetail.reviewerName }} · {{ currentDetail.reviewedTime }}
            </span>
            <div v-if="currentDetail.reviewerNote" style="margin-top: 8px;">
              <div class="text-muted">审核备注:</div>
              <div>{{ currentDetail.reviewerNote }}</div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <template v-if="currentDetail && currentDetail.reviewStatus === 'PENDING'">
          <el-button type="danger" @click="openRejectDialog(currentDetail)">拒绝</el-button>
          <el-button type="primary" @click="handleLearn(currentDetail)">学习</el-button>
        </template>
      </template>
    </el-dialog>

    <!-- 拒绝弹窗 -->
    <el-dialog
      v-model="rejectVisible"
      title="拒绝候选"
      width="480px"
      :close-on-click-modal="false"
    >
      <el-form>
        <el-form-item label="拒绝理由" required>
          <el-input
            v-model="rejectNote"
            type="textarea"
            :rows="4"
            placeholder="请填写拒绝理由,例如:问答质量不达标 / 与现有 FAQ 重复 / 非真实问题等"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rejectVisible = false">取消</el-button>
        <el-button type="danger" @click="handleReject" :loading="rejectSubmitting">确认拒绝</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import {
  pageFaqCandidate,
  getFaqCandidateById,
  learnFaqCandidate,
  rejectFaqCandidate
} from '@/api/faqCandidate'

const list = ref([])
const loading = ref(false)
const reviewStatus = ref('PENDING')  // 默认显示待审核
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 详情弹窗
const detailVisible = ref(false)
const currentDetail = ref(null)

// 拒绝弹窗
const rejectVisible = ref(false)
const rejectNote = ref('')
const rejectTargetId = ref(null)
const rejectSubmitting = ref(false)

onMounted(() => loadList())

async function loadList() {
  loading.value = true
  try {
    const res = await pageFaqCandidate({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      reviewStatus: reviewStatus.value || undefined
    })
    list.value = res.data.records || []
    total.value = res.data.total || 0
  } catch (e) {
    ElMessage.error('加载候选列表失败')
  } finally {
    loading.value = false
  }
}

function onStatusChange() {
  pageNum.value = 1
  loadList()
}

async function openDetail(row) {
  try {
    const res = await getFaqCandidateById(row.id)
    currentDetail.value = res.data
    detailVisible.value = true
  } catch (e) {
    ElMessage.error('加载详情失败')
  }
}

function parsedImages(raw) {
  if (!raw) return []
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

async function handleLearn(row) {
  try {
    await ElMessageBox.confirm(
      `确认学习这条候选?\n问题:${row.question.substring(0, 50)}${row.question.length > 50 ? '...' : ''}`,
      '提示',
      { type: 'warning', confirmButtonText: '学习', cancelButtonText: '取消' }
    )
    const res = await learnFaqCandidate(row.id)
    ElMessage.success(`学习成功!已生成 FAQ #${res.data.promotedFaqId}`)
    detailVisible.value = false
    loadList()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('学习失败:' + (e.message || '未知错误'))
    }
  }
}

function openRejectDialog(row) {
  rejectTargetId.value = row.id
  rejectNote.value = ''
  rejectVisible.value = true
  // 如果是从详情弹窗打开的,把详情弹窗关掉
  detailVisible.value = false
}

async function handleReject() {
  if (!rejectNote.value.trim()) {
    ElMessage.warning('请填写拒绝理由')
    return
  }
  rejectSubmitting.value = true
  try {
    await rejectFaqCandidate(rejectTargetId.value, rejectNote.value.trim())
    ElMessage.success('已拒绝该候选')
    rejectVisible.value = false
    loadList()
  } catch (e) {
    ElMessage.error('拒绝失败:' + (e.message || '未知错误'))
  } finally {
    rejectSubmitting.value = false
  }
}
</script>

<style scoped>
.page-container { padding: 24px; }
.page-header { margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 600; color: #303133; }
.page-subtitle { font-size: 13px; color: #909399; margin-top: 4px; }
.search-bar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }
.pagination-wrap { margin-top: 20px; display: flex; justify-content: flex-end; }
.text-muted { color: #909399; font-size: 13px; }

/* 详情弹窗 */
.detail-block { padding: 0 8px; }
.detail-row {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}
.detail-row:last-child {
  border-bottom: none;
  margin-bottom: 0;
}
.detail-label {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 6px;
}
.detail-content {
  font-size: 14px;
  color: #303133;
  line-height: 1.6;
}
.image-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.thumb {
  width: 80px;
  height: 80px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid #ebeef5;
}
</style>