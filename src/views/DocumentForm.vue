<template>
  <div>
    <!-- 页面头部 -->
    <div class="page-header">
      <h1>{{ isEdit ? '✏️ 编辑功能文档' : '📝 新增功能文档' }}</h1>
      <el-button @click="$router.push('/')"
        style="background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.4); color: #fff;">
        返回列表
      </el-button>
    </div>

    <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" v-loading="pageLoading">

      <!-- ===== 基本信息 ===== -->
      <div class="content-card">
        <div class="section-title">基本信息</div>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="功能名称" prop="featureName">
              <el-input v-model="form.featureName" placeholder="请输入功能名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="英文名">
              <el-input v-model="form.englishName" placeholder="请输入英文名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="编制">
              <el-input v-model="form.author" placeholder="请输入编制人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="功能版本">
              <el-input v-model="form.version" placeholder="请输入版本号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="发行日期">
              <el-date-picker v-model="form.publishDate" type="date" placeholder="选择发行日期"
                value-format="YYYY-MM-DD" style="width: 100%;" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属公司">
              <el-input v-model="form.company" placeholder="请输入所属公司" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- ===== 功能简介 ===== -->
      <div class="content-card">
        <div class="section-title">功能简介</div>
        <el-form-item label="功能描述">
          <el-input v-model="form.featureIntro.description" type="textarea" :rows="4"
            placeholder="请输入一段关于功能的描述..." />
        </el-form-item>
        <el-form-item label="相关图片">
          <ImageUploader v-model="form.featureIntro.images" />
        </el-form-item>
      </div>

      <!-- ===== 功能描述（可动态添加） ===== -->
      <div class="content-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div class="section-title" style="margin-bottom: 0;">功能描述</div>
          <el-button type="primary" :icon="Plus" @click="addFeatureDetail" circle
            style="background: #667eea; border-color: #667eea;" />
        </div>

        <el-empty v-if="form.featureDetails.length === 0" description="暂无功能描述，点击右上角 + 添加" />

        <div v-for="(item, index) in form.featureDetails" :key="index" class="feature-item">
          <div class="feature-item-header">
            <span>功能 {{ index + 1 }}</span>
            <el-button type="danger" link :icon="Delete" @click="removeFeatureDetail(index)">
              移除
            </el-button>
          </div>
          <el-form-item label="功能标题">
            <el-input v-model="item.title" :placeholder="`功能${index + 1}的标题`" />
          </el-form-item>
          <el-form-item label="功能描述">
            <el-input v-model="item.description" type="textarea" :rows="3"
              :placeholder="`请输入功能${index + 1}的描述...`" />
          </el-form-item>
          <el-form-item label="相关图片">
            <ImageUploader v-model="item.images" />
          </el-form-item>
        </div>

        <el-button class="add-feature-btn" @click="addFeatureDetail">
          <el-icon><Plus /></el-icon>
          <span style="margin-left: 6px;">添加功能描述</span>
        </el-button>
      </div>

      <!-- ===== 操作指南 ===== -->
      <div class="content-card">
        <div class="section-title">操作指南</div>
        <el-form-item label="操作说明">
          <el-input v-model="form.operationGuide.description" type="textarea" :rows="4"
            placeholder="请输入操作指南..." />
        </el-form-item>
        <el-form-item label="相关图片">
          <ImageUploader v-model="form.operationGuide.images" />
        </el-form-item>
      </div>

      <!-- ===== 常见问题 ===== -->
      <div class="content-card">
        <div class="section-title">常见问题</div>
        <el-form-item label="问题说明">
          <el-input v-model="form.faq.description" type="textarea" :rows="4"
            placeholder="请输入常见问题..." />
        </el-form-item>
        <el-form-item label="相关图片">
          <ImageUploader v-model="form.faq.images" />
        </el-form-item>
      </div>

      <!-- ===== 关联视频 ===== -->
      <div class="content-card">
        <div class="section-title">关联教学视频</div>
        <VideoUploader ref="videoUploaderRef" :featureId="route.params.id" />
      </div>

      <!-- ===== 提交按钮 ===== -->
      <div class="content-card" style="text-align: center; padding: 20px;">
        <el-button @click="$router.push('/')" size="large">取 消</el-button>
        <el-button type="primary" size="large" :loading="submitLoading" @click="handleSubmit"
          style="background: #667eea; border-color: #667eea; min-width: 120px;">
          {{ isEdit ? '保存修改' : '提交文档' }}
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { addDocument, updateDocument, getDocumentById } from '../api/document'
import { ElMessage } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import ImageUploader from './components/ImageUploader.vue'
import VideoUploader from './components/VideoUploader.vue'
import { bindVideos } from '../api/video'

const route = useRoute()
const router = useRouter()
const formRef = ref(null)
const pageLoading = ref(false)
const submitLoading = ref(false)
const videoUploaderRef = ref(null)

const isEdit = computed(() => !!route.params.id)

const createEmptySection = () => ({ description: '', images: [] })
const createEmptyDetail = () => ({ title: '', description: '', images: [] })

const form = reactive({
  featureName: '',
  englishName: '',
  author: '',
  version: '',
  publishDate: '',
  company: '',
  featureIntro: createEmptySection(),
  featureDetails: [],
  operationGuide: createEmptySection(),
  faq: createEmptySection(),
  videoUrls: [],
})

const rules = {
  featureName: [{ required: true, message: '请输入功能名称', trigger: 'blur' }],
}

// 添加功能描述
const addFeatureDetail = () => {
  form.featureDetails.push(createEmptyDetail())
}

// 移除功能描述
const removeFeatureDetail = (index) => {
  form.featureDetails.splice(index, 1)
}

// 加载编辑数据
const loadDocument = async () => {
  if (!route.params.id) return
  pageLoading.value = true
  try {
    const res = await getDocumentById(route.params.id)
    const data = res.data
    Object.assign(form, {
      featureName: data.featureName || '',
      englishName: data.englishName || '',
      author: data.author || '',
      version: data.version || '',
      publishDate: data.publishDate || '',
      company: data.company || '',
      featureIntro: data.featureIntro || createEmptySection(),
      featureDetails: data.featureDetails || [],
      operationGuide: data.operationGuide || createEmptySection(),
      faq: data.faq || createEmptySection(),
      videoUrls: data.videoUrls || [],
    })
  } finally {
    pageLoading.value = false
  }
}

//提交表单
const handleSubmit = async () => {
  await formRef.value.validate()
  submitLoading.value = true
  try {
    const payload = { ...form }
    if (isEdit.value) {
      payload.id = Number(route.params.id)
      await updateDocument(payload)
      ElMessage.success('修改成功')
    } else {
      const res = await addDocument(payload)
      // 新增成功后，把上传的视频关联到这个文档
      const newDocId = res.data
      if (newDocId && videoUploaderRef.value) {
        const videoIds = videoUploaderRef.value.getPendingVideoIds()
        if (videoIds.length > 0) {
          await bindVideos(newDocId, videoIds)
        }
      }
      ElMessage.success('新增成功')
    }
    router.push('/')
  } finally {
    submitLoading.value = false
  }
}

onMounted(() => {
  loadDocument()
})
</script>
