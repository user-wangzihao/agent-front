import request from './request'

/**
 * 获取 KPI 快照（5 个卡的数据）
 */
export function getKpiSnapshot() {
  return request.get('/admin/dashboard/kpi')
}

/**
 * 获取滚动时间线
 * @param {number} limit 条数，默认 20
 */
export function getTimeline(limit = 20) {
  return request.get('/admin/dashboard/timeline', { params: { limit } })
}

/**
 * B6: 按 feature 聚合缓存条目 (大屏"缓存详情"表格数据源).
 * 跟 Prometheus 全局命中率卡互补 — 这是冷路径 SQL 直查, 看每个 feature 缓存效果.
 */
export function getCacheByFeature() {
  return request.get('/admin/cache/by-feature')
}