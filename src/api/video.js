import request from './request'

// 查询功能文档关联的视频列表
export function getVideoList(featureId) {
  return request.get(`/video/list/${featureId}`)
}

// 批量关联视频到功能文档
export function bindVideos(featureId, videoIds) {
  return request.post(`/video/bind/${featureId}`, videoIds)
}

// 删除视频
export function deleteVideo(id) {
  return request.delete(`/video/${id}`)
}

// 学习视频
export function learnVideo(featureId) {
  return request.post(`/agent/learn/video/${featureId}`)
}
