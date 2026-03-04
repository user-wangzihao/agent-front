<template>
    <el-dialog
      v-model="visible"
      :title="isEdit ? '编辑 FAQ' : '新增 FAQ'"
      width="780px"
      :close-on-click-modal="false"
      @close="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
  
        <!-- 问题描述 -->
        <el-form-item label="问题描述" prop="question">
          <el-input
            v-model="form.question"
            type="textarea"
            :rows="3"
            placeholder="请输入用户的问题描述..."
          />
        </el-form-item>
  
        <!-- 问题图片 -->
        <el-form-item label="问题图片">
          <div class="image-upload-area">
            <div
              v-for="(url, idx) in form.questionImages"
              :key="idx"
              class="image-item"
            >
              <el-image :src="url" fit="cover" class="preview-img" :preview-src-list="form.questionImages" />
              <el-icon class="remove-btn" @click="removeImage('questionImages', idx)"><Close /></el-icon>
            </div>
            <el-upload
              :show-file-list="false"
              :before-upload="(file) => beforeUpload(file, 'questionImages')"
              accept="image/*"
              class="upload-btn"
            >
              <el-icon><Plus /></el-icon>
              <span>上传图片</span>
            </el-upload>
          </div>
        </el-form-item>
  
        <!-- 分隔线 -->
        <el-divider content-position="left">答案部分</el-divider>
  
        <!-- 答案内容 -->
        <el-form-item label="答案内容" prop="answer">
          <el-input
            v-model="form.answer"
            type="textarea"
            :rows="5"
            placeholder="请输入标准答案，支持分步骤说明..."
          />
        </el-form-item>
  
        <!-- 答案图片 -->
        <el-form-item label="答案图片">
          <div class="image-upload-area">
            <div
              v-for="(url, idx) in form.answerImages"
              :key="idx"
              class="image-item"
            >
              <el-image :src="url" fit="cover" class="preview-img" :preview-src-list="form.answerImages" />
              <el-icon class="remove-btn" @click="removeImage('answerImages', idx)"><Close /></el-icon>
            </div>
            <el-upload
              :show-file-list="false"
              :before-upload="(file) => beforeUpload(file, 'answerImages')"
              accept="image/*"
              class="upload-btn"
            >
              <el-icon><Plus /></el-icon>
              <span>上传图片</span>
            </el-upload>
          </div>
        </el-form-item>
  
        <!-- 关联功能 -->
        <el-form-item label="关联功能">
          <el-select
            v-model="form.relatedFeatureId"
            placeholder="可选：选择关联的功能点"
            clearable
            filterable
            style="width: 100%"
            @change="onFeatureChange"
          >
            <el-option
              v-for="item in featureOptions"
              :key="item.id"
              :label="item.featureName"
              :value="item.id"
            />
          </el-select>
          <div class="form-tip">关联功能后，该 FAQ 在检索时会带上功能上下文，提升回答准确性</div>
        </el-form-item>
  
      </el-form>
  
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          {{ isEdit ? '保存' : '新增' }}
        </el-button>
      </template>
    </el-dialog>
  </template>
  
  <script setup>
  import { ref, reactive, computed } from 'vue'
  import { ElMessage } from 'element-plus'
  import { Plus, Close } from '@element-plus/icons-vue'
  import { addFaq, updateFaq, getFaqById, listAllFeatures } from '@/api/faq'
  import request from '@/api/request'
  
  const emit = defineEmits(['success'])
  
  const visible = ref(false)
  const submitting = ref(false)
  const formRef = ref(null)
  const featureOptions = ref([])
  
  const defaultForm = () => ({
    id: null,
    question: '',
    questionImages: [],
    answer: '',
    answerImages: [],
    relatedFeatureId: null,
    relatedFeatureName: ''
  })
  
  const form = reactive(defaultForm())
  const isEdit = computed(() => !!form.id)
  
  const rules = {
    question: [{ required: true, message: '请输入问题描述', trigger: 'blur' }],
    answer: [{ required: true, message: '请输入答案内容', trigger: 'blur' }]
  }
  
  // 打开弹窗
  async function open(id) {
    resetForm()
    await loadFeatureOptions()
    if (id) {
      const res = await getFaqById(id)
      Object.assign(form, res.data)
      form.questionImages = form.questionImages || []
      form.answerImages = form.answerImages || []
    }
    visible.value = true
  }
  
  // 加载功能列表选项
  async function loadFeatureOptions() {
    try {
      const res = await listAllFeatures()
      featureOptions.value = res.data.records || []
    } catch (e) {
      featureOptions.value = []
    }
  }
  
  // 关联功能变更，同步 featureName
  function onFeatureChange(id) {
    if (!id) {
      form.relatedFeatureName = ''
      return
    }
    const found = featureOptions.value.find(f => f.id === id)
    form.relatedFeatureName = found ? found.featureName : ''
  }
  
  // 图片上传
  async function beforeUpload(file, field) {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await request.post('/file/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      form[field].push(res.data)
      ElMessage.success('上传成功')
    } catch (e) {
      ElMessage.error('上传失败')
    }
    return false // 阻止 el-upload 自动上传
  }
  
  // 删除图片
  function removeImage(field, idx) {
    form[field].splice(idx, 1)
  }
  
  // 提交
  async function handleSubmit() {
    await formRef.value.validate()
    submitting.value = true
    try {
      if (isEdit.value) {
        await updateFaq({ ...form })
        ElMessage.success('更新成功')
      } else {
        await addFaq({ ...form })
        ElMessage.success('新增成功')
      }
      visible.value = false
      emit('success')
    } catch (e) {
      ElMessage.error('操作失败: ' + (e.message || '未知错误'))
    } finally {
      submitting.value = false
    }
  }
  
  function resetForm() {
    Object.assign(form, defaultForm())
    formRef.value?.clearValidate()
  }
  
  defineExpose({ open })
  </script>
  
  <style scoped>
  .image-upload-area {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: flex-start;
  }
  .image-item {
    position: relative;
    width: 90px;
    height: 90px;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #dcdfe6;
  }
  .preview-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .remove-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    background: rgba(0,0,0,0.5);
    color: #fff;
    border-radius: 50%;
    cursor: pointer;
    font-size: 14px;
    padding: 2px;
  }
  .remove-btn:hover { background: rgba(220,53,69,0.8); }
  .upload-btn {
    width: 90px;
    height: 90px;
    border: 1px dashed #c0ccda;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #909399;
    font-size: 12px;
    gap: 4px;
  }
  .upload-btn:hover { border-color: #409eff; color: #409eff; }
  .form-tip { font-size: 12px; color: #909399; margin-top: 6px; }
  </style>