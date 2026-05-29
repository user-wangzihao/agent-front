<template>
  <div class="dashboard-container">
    <!-- 页头 -->
    <div class="page-header">
      <div class="page-title">运营大屏</div>
      <div class="header-right">
        <span class="update-hint">
          {{ lastUpdateText }}
        </span>
        <el-button :loading="kpiLoading" @click="refresh">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>
    </div>

    <!-- KPI 卡片区 -->
    <div class="kpi-grid" v-loading="kpiLoading">

      <!-- 卡1: 今日对话 -->
      <div class="kpi-card">
        <div class="kpi-icon chat-icon"><el-icon><ChatDotRound /></el-icon></div>
        <div class="kpi-body">
          <div class="kpi-label">今日对话</div>
          <div class="kpi-value">{{ kpi.todayChatCount ?? '—' }}</div>
          <div class="kpi-sub">{{ kpi.todayActiveUserCount ?? 0 }} 位活跃用户</div>
        </div>
      </div>

      <!-- 卡2: Graph 耗时 -->
      <div class="kpi-card">
        <div class="kpi-icon latency-icon"><el-icon><Timer /></el-icon></div>
        <div class="kpi-body">
          <div class="kpi-label">Graph 端到端耗时 (P95)</div>
          <div class="kpi-value">
            {{ kpi.graphLatencyP95Ms ? kpi.graphLatencyP95Ms + ' ms' : '—' }}
          </div>
          <div class="kpi-sub">P50 {{ kpi.graphLatencyP50Ms ?? 0 }} ms</div>
        </div>
      </div>

      <!-- 卡3: FAQ 命中率 -->
      <div class="kpi-card">
        <div class="kpi-icon faq-icon"><el-icon><CircleCheck /></el-icon></div>
        <div class="kpi-body">
          <div class="kpi-label">FAQ 命中率</div>
          <div class="kpi-value">{{ kpi.faqHitRate != null ? kpi.faqHitRate + '%' : '—' }}</div>
          <div class="kpi-sub">
            <span :class="deltaClass(kpi.faqHitRateDeltaVsYesterday)">
              {{ deltaText(kpi.faqHitRateDeltaVsYesterday, '%') }}
            </span>
            &nbsp;vs 昨日
          </div>
        </div>
      </div>

      <!-- 卡4: 今日 Token -->
      <div class="kpi-card">
        <div class="kpi-icon token-icon"><el-icon><Coin /></el-icon></div>
        <div class="kpi-body">
          <div class="kpi-label">今日 Token</div>
          <div class="kpi-value">{{ formatToken(kpi.todayTokenTotal) }}</div>
          <div class="kpi-sub">
            {{ kpi.topTokenScene || '—' }} 占 {{ kpi.topTokenScenePercent ?? 0 }}%
          </div>
        </div>
      </div>

      <!-- 卡5: 飞轮 + 工单 -->
      <div class="kpi-card">
        <div class="kpi-icon flywheel-icon"><el-icon><DataAnalysis /></el-icon></div>
        <div class="kpi-body">
          <div class="kpi-label">数据飞轮</div>
          <div class="kpi-value">{{ kpi.faqCandidatePending ?? '—' }}</div>
          <div class="kpi-sub">
            待审 FAQ &nbsp;|&nbsp; 今日工单 {{ kpi.todayTicketCount ?? 0 }}
            <span v-if="kpi.faqCandidateDeltaVsYesterday != null" :class="deltaClass(kpi.faqCandidateDeltaVsYesterday)">
              &nbsp;{{ deltaText(kpi.faqCandidateDeltaVsYesterday) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 卡6: 缓存命中率 (B6) -->
      <!-- 数据来源: Prometheus 24h 窗口聚合 (sum/L1/L2/miss). 故意不暴露 feature_name 标签
           避免高基数 (700+ feature). 按 feature 拆分见下方"缓存详情"表格 (SQL 直查). -->
      <div class="kpi-card">
        <div class="kpi-icon cache-icon"><el-icon><CoffeeCup /></el-icon></div>
        <div class="kpi-body">
          <div class="kpi-label">缓存命中率 (24h)</div>
          <div class="kpi-value">{{ kpi.cacheHitRate != null ? kpi.cacheHitRate + '%' : '—' }}</div>
          <div class="kpi-sub">
            L1 {{ kpi.cacheHitL1Count ?? 0 }} &nbsp;|&nbsp;
            L2 {{ kpi.cacheHitL2Count ?? 0 }} &nbsp;|&nbsp;
            miss {{ kpi.cacheMissCount ?? 0 }}
          </div>
        </div>
      </div>

      <!-- 卡7: Self-RAG 自反思裁决 (最后一刀) -->
      <!-- 数据来源: Prometheus agent_reflect_verdict_total 按 verdict 分组, 24h 窗口.
           量化 how-to 类回答质量: 一次过率 / 纠正率 / 第2版胜出率 / 假问题率. -->
      <div class="kpi-card">
        <div class="kpi-icon reflect-icon"><el-icon><MagicStick /></el-icon></div>
        <div class="kpi-body">
          <div class="kpi-label">自反思一次过率 (24h)</div>
          <div class="kpi-value">{{ kpi.reflectPassRate != null ? kpi.reflectPassRate + '%' : '—' }}</div>
          <div class="kpi-sub">
            纠正 {{ kpi.reflectRetryRate ?? 0 }}% &nbsp;|&nbsp;
            二版胜出 {{ kpi.reflectV2WinRate ?? 0 }}% &nbsp;|&nbsp;
            兜底 {{ kpi.reflectGiveUpRate ?? 0 }}%
          </div>
        </div>
      </div>

      <!-- 卡8: Self-RAG judge 延迟 (思路B: 量化自反思延迟成本) -->
      <div class="kpi-card">
        <div class="kpi-icon judge-icon"><el-icon><Stopwatch /></el-icon></div>
        <div class="kpi-body">
          <div class="kpi-label">自反思 judge 耗时 (P95)</div>
          <div class="kpi-value">
            {{ kpi.reflectJudgeLatencyP95Ms ? kpi.reflectJudgeLatencyP95Ms + ' ms' : '—' }}
          </div>
          <div class="kpi-sub">
            P50 {{ kpi.reflectJudgeLatencyP50Ms ?? 0 }} ms &nbsp;|&nbsp;
            共评估 {{ kpi.reflectTotalCount ?? 0 }} 次
          </div>
        </div>
      </div>

    </div>

    <!-- 滚动时间线 -->
    <div class="section-title">最近对话时间线</div>
    <el-table
      :data="timeline"
      v-loading="timelineLoading"
      style="width: 100%"
      :stripe="true"
      size="small"
    >
      <el-table-column label="时间" prop="createTime" width="160" />
      <el-table-column label="用户" prop="userNickname" width="100" />
      <el-table-column label="问题摘要" prop="questionSummary" min-width="240" show-overflow-tooltip />
      <el-table-column label="功能模块" prop="matchedFeature" width="140">
        <template #default="{ row }">
          <el-tag v-if="row.matchedFeature" type="info" size="small">{{ row.matchedFeature }}</el-tag>
          <span v-else class="text-muted">—</span>
        </template>
      </el-table-column>
      <el-table-column label="FAQ命中" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.faqHit ? 'success' : 'info'" size="small">
            {{ row.faqHit ? '命中' : '未命中' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="响应耗时" width="100" align="right">
        <template #default="{ row }">
          <span :class="latencyClass(row.totalLatencyMs)">
            {{ row.totalLatencyMs ? row.totalLatencyMs + ' ms' : '—' }}
          </span>
        </template>
      </el-table-column>
    </el-table>

    <!-- ========== B6: 缓存详情 (按 feature 拆分) ========== -->
    <!-- 跟卡6 互补: 卡6 看全局命中率 (Prometheus), 这里看每个 feature 缓存效果 (SQL 直查 semantic_cache 表).
         数据来源故意不走 Prometheus, 因为 feature 数量 700+ 会导致 Prometheus 基数爆炸. -->
    <div class="section-title">缓存详情（按功能）</div>
    <el-table
      :data="cacheByFeature"
      v-loading="cacheLoading"
      style="width: 100%"
      :stripe="true"
      size="small"
      :default-sort="{ prop: 'totalHits', order: 'descending' }"
      max-height="400"
    >
      <el-table-column label="功能模块" prop="featureName" min-width="180" show-overflow-tooltip />
      <el-table-column label="缓存条目数" prop="totalEntries" width="110" align="right" sortable />
      <el-table-column label="累计命中" prop="totalHits" width="100" align="right" sortable />
      <el-table-column label="负反馈分" prop="totalFeedbackScore" width="100" align="right" sortable>
        <template #default="{ row }">
          <span :class="feedbackClass(row.totalFeedbackScore)">{{ row.totalFeedbackScore }}</span>
        </template>
      </el-table-column>
      <el-table-column label="ACTIVE" prop="activeCount" width="90" align="center">
        <template #default="{ row }">
          <el-tag size="small" type="success">{{ row.activeCount }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="DEGRADED" prop="degradedCount" width="100" align="center">
        <template #default="{ row }">
          <el-tag size="small" :type="row.degradedCount > 0 ? 'warning' : 'info'">{{ row.degradedCount }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="INVALID" prop="invalidCount" width="90" align="center">
        <template #default="{ row }">
          <el-tag size="small" :type="row.invalidCount > 0 ? 'danger' : 'info'">{{ row.invalidCount }}</el-tag>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Refresh, ChatDotRound, Timer, CircleCheck, Coin, DataAnalysis, CoffeeCup, MagicStick, Stopwatch
} from '@element-plus/icons-vue'
import { getKpiSnapshot, getTimeline, getCacheByFeature } from '@/api/dashboard'

// ==================== 状态 ====================
const kpi = ref({})
const timeline = ref([])
const cacheByFeature = ref([])  // B6: 缓存详情表格数据
const kpiLoading = ref(false)
const timelineLoading = ref(false)
const cacheLoading = ref(false)  // B6
const lastUpdatedAt = ref(null)
let timer = null

// ==================== 计算属性 ====================
const lastUpdateText = computed(() => {
  if (!lastUpdatedAt.value) return ''
  const sec = Math.floor((Date.now() - lastUpdatedAt.value) / 1000)
  if (sec < 5) return '刚刚更新'
  if (sec < 60) return `${sec} 秒前更新`
  return `${Math.floor(sec / 60)} 分钟前更新`
})

// ==================== 数据加载 ====================
async function loadKpi() {
  kpiLoading.value = true
  try {
    const res = await getKpiSnapshot()
    kpi.value = res.data || {}
    lastUpdatedAt.value = Date.now()
  } catch (e) {
    ElMessage.error('KPI 数据加载失败')
  } finally {
    kpiLoading.value = false
  }
}

async function loadTimeline() {
  timelineLoading.value = true
  try {
    const res = await getTimeline(20)
    timeline.value = res.data || []
  } catch (e) {
    // 时间线失败不弹错误，静默降级
  } finally {
    timelineLoading.value = false
  }
}

// B6: 加载按 feature 聚合的缓存详情. 失败静默, 这是辅助信息不影响主功能.
async function loadCacheByFeature() {
  cacheLoading.value = true
  try {
    const res = await getCacheByFeature()
    cacheByFeature.value = res.data || []
  } catch (e) {
    // 静默, 不弹错误
  } finally {
    cacheLoading.value = false
  }
}

async function refresh() {
  await Promise.all([loadKpi(), loadTimeline(), loadCacheByFeature()])
}

// ==================== 生命周期 ====================
onMounted(() => {
  refresh()
  // 30s 自动刷新
  timer = setInterval(refresh, 30000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// ==================== 格式化工具 ====================
function formatToken(val) {
  if (val == null) return '—'
  if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'
  if (val >= 1000) return (val / 1000).toFixed(1) + 'K'
  return String(val)
}

function deltaText(val, suffix = '') {
  if (val == null) return ''
  const abs = Math.abs(val).toFixed(1)
  if (val > 0) return `+${abs}${suffix}`
  if (val < 0) return `-${abs}${suffix}`
  return `持平`
}

function deltaClass(val) {
  if (val == null || val === 0) return 'delta-neutral'
  return val > 0 ? 'delta-up' : 'delta-down'
}

function latencyClass(ms) {
  if (!ms) return ''
  if (ms < 3000) return 'latency-good'
  if (ms < 8000) return 'latency-warn'
  return 'latency-bad'
}

// B6: 负反馈分着色. 0=正常灰, <5=轻微黄, >=5=明显红 (按 SemanticCacheProperties.feedbackThreshold 默认 5 来定阈值).
function feedbackClass(score) {
  if (score == null || score === 0) return ''
  if (score < 5) return 'feedback-warn'
  return 'feedback-bad'
}
</script>

<style scoped>
.dashboard-container {
  padding: 24px;
}

/* ===== 页头 ===== */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.update-hint {
  font-size: 13px;
  color: #909399;
}

/* ===== KPI 卡片网格 ===== */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 28px;
}

.kpi-card {
  background: #ffffff;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s;
}

.kpi-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.kpi-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.chat-icon     { background: #ecf5ff; color: #409eff; }
.latency-icon  { background: #f0f9eb; color: #67c23a; }
.faq-icon      { background: #fdf6ec; color: #e6a23c; }
.token-icon    { background: #fef0f0; color: #f56c6c; }
.flywheel-icon { background: #f4f4f5; color: #909399; }
.cache-icon    { background: #f0f5ff; color: #5e72e4; }   /* B6: 紫蓝色, 跟其他卡区分 */
.reflect-icon  { background: #f0f9eb; color: #67c23a; }   /* Self-RAG: 绿色, 质量正向 */
.judge-icon    { background: #fdf6ec; color: #e6a23c; }   /* Self-RAG: 橙色, 延迟成本 */

.kpi-body {
  flex: 1;
  min-width: 0;
}

.kpi-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kpi-value {
  font-size: 26px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
  margin-bottom: 6px;
}

.kpi-sub {
  font-size: 12px;
  color: #909399;
}

/* ===== delta 颜色 ===== */
.delta-up      { color: #67c23a; font-weight: 600; }
.delta-down    { color: #f56c6c; font-weight: 600; }
.delta-neutral { color: #909399; }

/* ===== 时间线标题 ===== */
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 14px;
  padding-left: 10px;
  border-left: 3px solid #409eff;
}

/* ===== 时间线耗时颜色 ===== */
.latency-good { color: #67c23a; }
.latency-warn { color: #e6a23c; }
.latency-bad  { color: #f56c6c; }

/* B6: 负反馈分着色, 跟 latency 类同款配色 */
.feedback-warn { color: #e6a23c; font-weight: 600; }
.feedback-bad  { color: #f56c6c; font-weight: 600; }

.text-muted { color: #909399; font-size: 13px; }

/* ===== 响应式：屏幕窄时 5列→3列→2列 ===== */
@media (max-width: 1400px) {
  .kpi-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 900px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>