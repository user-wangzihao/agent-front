<template>
  <div>
    <div class="page-header">
      <h1>📋 文档详情</h1>
      <div>
        <el-button @click="$router.push(`/document/edit/${route.params.id}`)"
          style="background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.4); color: #fff; margin-right: 8px;">
          编辑
        </el-button>
        <el-button @click="$router.push('/')"
          style="background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.4); color: #fff;">
          返回列表
        </el-button>
      </div>
    </div>

    <div v-loading="loading">
      <!-- 基本信息 -->
      <div class="content-card">
        <div class="section-title">基本信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="功能名称">{{ doc.featureName }}</el-descriptions-item>
          <el-descriptions-item label="英文名">{{ doc.englishName }}</el-descriptions-item>
          <el-descriptions-item label="编制人">{{ doc.author }}</el-descriptions-item>
          <el-descriptions-item label="功能版本">{{ doc.version }}</el-descriptions-item>
          <el-descriptions-item label="发行日期">{{ doc.publishDate }}</el-descriptions-item>
          <el-descriptions-item label="所属公司">{{ doc.company }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 功能简介 -->
      <div class="content-card" v-if="doc.featureIntro">
        <div class="section-title">功能简介</div>
        <p style="color: #606266; line-height: 1.8; margin-bottom: 16px; white-space: pre-wrap;">
          {{ doc.featureIntro.description }}
        </p>
        <div v-if="doc.featureIntro.images?.length" style="display: flex; flex-wrap: wrap; gap: 12px;">
          <el-image v-for="(img, i) in doc.featureIntro.images" :key="i" :src="img"
            :preview-src-list="doc.featureIntro.images" :initial-index="i"
            style="width: 160px; height: 120px; border-radius: 8px;" fit="cover" />
        </div>
      </div>

      <!-- 功能描述 -->
      <div class="content-card" v-if="doc.featureDetails?.length">
        <div class="section-title">功能描述</div>
        <div v-for="(item, index) in doc.featureDetails" :key="index" class="feature-item">
          <div class="feature-item-header">
            <span>{{ item.title || `功能 ${index + 1}` }}</span>
          </div>
          <p style="color: #606266; line-height: 1.8; margin-bottom: 12px; white-space: pre-wrap;">
            {{ item.description }}
          </p>
          <div v-if="item.images?.length" style="display: flex; flex-wrap: wrap; gap: 12px;">
            <el-image v-for="(img, i) in item.images" :key="i" :src="img"
              :preview-src-list="item.images" :initial-index="i"
              style="width: 160px; height: 120px; border-radius: 8px;" fit="cover" />
          </div>
        </div>
      </div>

      <!-- 操作指南 -->
      <div class="content-card" v-if="doc.operationGuide">
        <div class="section-title">操作指南</div>
        <p style="color: #606266; line-height: 1.8; margin-bottom: 16px; white-space: pre-wrap;">
          {{ doc.operationGuide.description }}
        </p>
        <div v-if="doc.operationGuide.images?.length" style="display: flex; flex-wrap: wrap; gap: 12px;">
          <el-image v-for="(img, i) in doc.operationGuide.images" :key="i" :src="img"
            :preview-src-list="doc.operationGuide.images" :initial-index="i"
            style="width: 160px; height: 120px; border-radius: 8px;" fit="cover" />
        </div>
      </div>

      <!-- 常见问题 -->
      <div class="content-card" v-if="doc.faq">
        <div class="section-title">常见问题</div>
        <p style="color: #606266; line-height: 1.8; margin-bottom: 16px; white-space: pre-wrap;">
          {{ doc.faq.description }}
        </p>
        <div v-if="doc.faq.images?.length" style="display: flex; flex-wrap: wrap; gap: 12px;">
          <el-image v-for="(img, i) in doc.faq.images" :key="i" :src="img"
            :preview-src-list="doc.faq.images" :initial-index="i"
            style="width: 160px; height: 120px; border-radius: 8px;" fit="cover" />
        </div>
      </div>

      <!-- 关联视频 -->
      <div class="content-card" v-if="videos.length">
        <div class="section-title">关联教学视频</div>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div v-for="video in videos" :key="video.id" class="video-detail-item">
            <div class="video-detail-info">
              <el-icon style="font-size: 24px; color: #667eea;"><VideoPlay /></el-icon>
              <div>
                <div style="font-size: 14px; color: #303133;">{{ video.originalName }}</div>
                <div style="font-size: 12px; color: #909399;">{{ formatFileSize(video.fileSize) }}</div>
              </div>
              <el-tag v-if="video.learnStatus === 2" size="small" type="success">已学习</el-tag>
              <el-tag v-else size="small" type="info">未学习</el-tag>
            </div>
            <video :src="video.fileUrl" controls preload="metadata"
              style="width: 100%; max-width: 720px; border-radius: 8px; background: #000; margin-top: 8px;" />
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getDocumentById } from '../api/document'
import { VideoPlay } from '@element-plus/icons-vue'
import { getVideoList } from '../api/video'

const route = useRoute()
const loading = ref(false)
const videos = ref([])

const formatFileSize = (bytes) => {
  if (!bytes) return '未知'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

const doc = reactive({
  featureName: '',
  englishName: '',
  author: '',
  version: '',
  publishDate: '',
  company: '',
  featureIntro: null,
  featureDetails: [],
  operationGuide: null,
  faq: null,
  videoUrls: [],
})

onMounted(async () => {
  loading.value = true
  try {
    const res = await getDocumentById(route.params.id)
    Object.assign(doc, res.data)
    const videoRes = await getVideoList(route.params.id)
    videos.value = videoRes.data || []
  } finally {
    loading.value = false
  }
})
</script>
