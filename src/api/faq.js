import request from './request'

// 新增 FAQ
export function addFaq(data) {
  return request.post('/faq', data)
}

// 更新 FAQ
export function updateFaq(data) {
  return request.put('/faq', data)
}

// 获取 FAQ 详情
export function getFaqById(id) {
  return request.get(`/faq/${id}`)
}

// 分页查询
export function pageFaq(data) {
  return request.post('/faq/page', data)
}

// 删除 FAQ
export function deleteFaq(id) {
  return request.delete(`/faq/${id}`)
}

// 学习 FAQ（向量化）
export function learnFaq(id) {
  return request.post(`/faq/${id}/learn`)
}

// 获取所有功能列表（用于关联功能下拉选）
export function listAllFeatures() {
  return request.post('/document/page', { pageNum: 1, pageSize: 999, keyword: '' })
}