import request from './request'

// 分页查询候选列表
export function pageFaqCandidate(params) {
  return request.get('/faq-candidate/page', { params })
}

// 获取候选详情
export function getFaqCandidateById(id) {
  return request.get(`/faq-candidate/${id}`)
}

// 学习候选(三步:INSERT faq_document + 向量学习 + 回写)
export function learnFaqCandidate(id) {
  return request.post(`/faq-candidate/${id}/learn`)
}

// 拒绝候选(必填 reviewerNote)
export function rejectFaqCandidate(id, reviewerNote) {
  return request.post(`/faq-candidate/${id}/reject`, { reviewerNote })
}