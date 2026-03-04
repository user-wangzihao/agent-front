<template>
  <div class="image-upload-area">
    <el-upload
      :action="uploadAction"
      :headers="uploadHeaders"
      list-type="picture-card"
      :file-list="fileList"
      :on-success="handleSuccess"
      :on-remove="handleRemove"
      :on-preview="handlePreview"
      :before-upload="beforeUpload"
      name="file"
      accept="image/*"
    >
      <el-icon><Plus /></el-icon>
    </el-upload>

    <!-- 图片预览 -->
    <el-dialog v-model="previewVisible" title="图片预览" width="60%" append-to-body>
      <img :src="previewUrl" alt="preview" style="width: 100%;" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['update:modelValue'])

const uploadAction = '/api/file/upload'
const previewVisible = ref(false)
const previewUrl = ref('')

const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
})

// 将 URL 数组转为 el-upload 所需格式
const fileList = computed(() => {
  return (props.modelValue || []).map((url, index) => ({
    name: `image-${index}`,
    url: url,
  }))
})

const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    ElMessage.error('只能上传图片文件！')
    return false
  }
  const isLt10M = file.size / 1024 / 1024 < 10
  if (!isLt10M) {
    ElMessage.error('图片大小不能超过 10MB！')
    return false
  }
  return true
}

const handleSuccess = (response) => {
  if (response.code === 200) {
    const newImages = [...(props.modelValue || []), response.data]
    emit('update:modelValue', newImages)
    ElMessage.success('图片上传成功')
  } else {
    ElMessage.error(response.message || '上传失败')
  }
}

const handleRemove = (file) => {
  const newImages = (props.modelValue || []).filter((url) => url !== file.url)
  emit('update:modelValue', newImages)
}

const handlePreview = (file) => {
  previewUrl.value = file.url
  previewVisible.value = true
}
</script>

<style scoped>
.image-upload-area :deep(.el-upload--picture-card) {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  border: 2px dashed #d9d9d9;
  transition: border-color 0.3s;
}

.image-upload-area :deep(.el-upload--picture-card:hover) {
  border-color: #667eea;
}

.image-upload-area :deep(.el-upload-list__item) {
  width: 120px;
  height: 120px;
  border-radius: 8px;
}
</style>
