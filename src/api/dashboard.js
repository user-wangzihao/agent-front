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