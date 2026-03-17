<template>
  <div class="video-upload-area">
    <!-- 上传区域 -->
    <el-upload
      :action="uploadAction"
      :headers="uploadHeaders"
      :data="uploadData"
      :show-file-list="false"
      :before-upload="beforeUpload"
      :on-success="handleSuccess"
      :on-error="handleError"
      :on-progress="handleProgress"
      name="file"
      accept="video/mp4,video/avi,video/mov,video/wmv,video/flv,video/mkv,video/*"
      drag
    >
      <div class="upload-trigger">
        <el-icon class="upload-icon"><VideoCamera /></el-icon>
        <div class="upload-text">将视频拖到此处，或<em>点击上传</em></div>
        <div class="upload-hint">支持 mp4/avi/mov/mkv 等格式，单个视频不超过 500MB</div>
      </div>
    </el-upload>

    <!-- 上传中进度 -->
    <div v-if="uploading" class="upload-progress">
      <el-progress :percentage="uploadPercent" :stroke-width="8" striped striped-flow />
      <span class="progress-text">正在上传 {{ uploadingName }}...</span>
    </div>

    <!-- 已上传的视频列表 -->
    <div v-if="videoList.length > 0" class="video-list">
      <div v-for="(video, index) in videoList" :key="video.id || index" class="video-item">
        <div class="video-info">
          <el-icon class="video-file-icon"><VideoPlay /></el-icon>
          <div class="video-meta">
            <div class="video-name" :title="video.originalName">{{ video.originalName }}</div>
            <div class="video-size">{{ formatFileSize(video.fileSize) }}</div>
          </div>
          <el-tag v-if="video.learnStatus === 0" size="small" type="info">未学习</el-tag>
          <el-tag v-else-if="video.learnStatus === 1" size="small" type="warning">学习中</el-tag>
          <el-tag v-else-if="video.learnStatus === 2" size="small" type="success">已学习</el-tag>
          <el-tag v-else-if="video.learnStatus === 3" size="small" type="danger">学习失败</el-tag>
        </div>
        <div class="video-actions">
          <el-button text size="small" @click="handlePreview(video)">预览</el-button>
          <el-popconfirm title="确定删除此视频？" @confirm="handleDelete(video, index)">
            <template #reference>
              <el-button text size="small" type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </div>
      </div>
    </div>

    <!-- 视频预览弹框 -->
    <el-dialog v-model="previewVisible" title="视频预览" width="720px" append-to-body destroy-on-close>
      <video :src="previewUrl" controls autoplay
        style="width: 100%; border-radius: 8px;" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { VideoCamera, VideoPlay } from '@element-plus/icons-vue'
import { getVideoList, deleteVideo } from '../../api/video'

const props = defineProps({
  // 功能文档ID（编辑模式下传入，新增模式下为空）
  featureId: {
    type: [Number, String],
    default: null,
  },
})

const emit = defineEmits(['update'])

// 视频列表（已保存到数据库的）
const videoList = ref([])
// 新上传但尚未关联featureId的视频（新增文档场景）
const pendingVideos = ref([])

const uploading = ref(false)
const uploadPercent = ref(0)
const uploadingName = ref('')
const previewVisible = ref(false)
const previewUrl = ref('')

const uploadAction = '/api/video/upload'

const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
})

const uploadData = computed(() => {
  return props.featureId ? { featureId: props.featureId } : {}
})

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (!bytes) return '未知'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

// 加载已有视频列表
const loadVideoList = async () => {
  if (!props.featureId) return
  try {
    const res = await getVideoList(props.featureId)
    videoList.value = res.data || []
  } catch (e) {
    console.error('加载视频列表失败', e)
  }
}

// 监听 featureId 变化（从新增变为编辑时）
watch(() => props.featureId, (newVal) => {
  if (newVal) {
    loadVideoList()
  }
})

onMounted(() => {
  loadVideoList()
})

const beforeUpload = (file) => {
  const isVideo = file.type.startsWith('video/')
  if (!isVideo) {
    ElMessage.error('只能上传视频文件！')
    return false
  }
  const isLt500M = file.size / 1024 / 1024 < 500
  if (!isLt500M) {
    ElMessage.error('视频大小不能超过 500MB！')
    return false
  }
  uploading.value = true
  uploadPercent.value = 0
  uploadingName.value = file.name
  return true
}

const handleProgress = (event) => {
  if (event.percent) {
    uploadPercent.value = Math.round(event.percent)
  }
}

const handleSuccess = (response) => {
  uploading.value = false
  if (response.code === 200) {
    const video = response.data
    videoList.value.push(video)
    // 如果是新增文档场景（没有featureId），记录下来后续关联
    if (!props.featureId) {
      pendingVideos.value.push(video.id)
    }
    emit('update', videoList.value)
    ElMessage.success('视频上传成功')
  } else {
    ElMessage.error(response.message || '上传失败')
  }
}

const handleError = () => {
  uploading.value = false
  ElMessage.error('视频上传失败，请重试')
}

const handlePreview = (video) => {
  previewUrl.value = video.fileUrl
  previewVisible.value = true
}

const handleDelete = async (video, index) => {
  try {
    if (video.id) {
      await deleteVideo(video.id)
    }
    videoList.value.splice(index, 1)
    emit('update', videoList.value)
    ElMessage.success('删除成功')
  } catch (e) {
    ElMessage.error('删除失败')
  }
}

// 暴露方法给父组件：获取待关联的视频ID列表
const getPendingVideoIds = () => {
  return videoList.value.map(v => v.id).filter(Boolean)
}

defineExpose({ getPendingVideoIds })
</script>

<style scoped>
.video-upload-area :deep(.el-upload) {
  width: 100%;
}

.video-upload-area :deep(.el-upload-dragger) {
  width: 100%;
  padding: 28px 20px;
  border: 2px dashed #d9d9d9;
  border-radius: 10px;
  transition: border-color 0.3s;
}

.video-upload-area :deep(.el-upload-dragger:hover) {
  border-color: #667eea;
}

.upload-trigger {
  text-align: center;
}

.upload-icon {
  font-size: 36px;
  color: #c0c4cc;
  margin-bottom: 6px;
}

.upload-text {
  font-size: 14px;
  color: #606266;
  margin-bottom: 4px;
}

.upload-text em {
  color: #667eea;
  font-style: normal;
}

.upload-hint {
  font-size: 12px;
  color: #909399;
}

/* 上传进度 */
.upload-progress {
  margin-top: 12px;
}

.progress-text {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  display: block;
}

/* 视频列表 */
.video-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.video-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #f9fafb;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  transition: all 0.2s;
}

.video-item:hover {
  background: #f0f2ff;
  border-color: #d4d7ff;
}

.video-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.video-file-icon {
  font-size: 28px;
  color: #667eea;
  flex-shrink: 0;
}

.video-meta {
  flex: 1;
  min-width: 0;
}

.video-name {
  font-size: 14px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-size {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.video-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
</style>