import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  // 登录页
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录', public: true }
  },

  // 管理端（带侧边栏布局）
  {
    path: '/',
    component: () => import('../views/layout/AdminLayout.vue'),
    meta: { adminOnly: true },
    children: [
      {
        path: '',
        redirect: '/documents'
      },
      {
        path: 'documents',
        name: 'DocumentList',
        component: () => import('../views/DocumentList.vue'),
        meta: { title: '功能文档管理', adminOnly: true }
      },
      {
        path: 'document/add',
        name: 'DocumentAdd',
        component: () => import('../views/DocumentForm.vue'),
        meta: { title: '新增功能文档', adminOnly: true }
      },
      {
        path: 'document/edit/:id',
        name: 'DocumentEdit',
        component: () => import('../views/DocumentForm.vue'),
        meta: { title: '编辑功能文档', adminOnly: true }
      },
      {
        path: 'document/detail/:id',
        name: 'DocumentDetail',
        component: () => import('../views/DocumentDetail.vue'),
        meta: { title: '文档详情', adminOnly: true }
      },
      {
        path: 'faq',
        name: 'FaqList',
        component: () => import('../views/FaqList.vue'),
        meta: { title: 'FAQ管理', adminOnly: true }
      },
      {
        path: 'faq-candidate',
        name: 'FaqCandidateList',
        component: () => import('../views/FaqCandidateList.vue'),
        meta: { title: 'FAQ候选审核', adminOnly: true }
      }
    ]
  },

  // 智能助手（独立页面，不用管理端布局）
  {
    path: '/chat',
    name: 'AgentChat',
    component: () => import('../views/AgentChat.vue'),
    meta: { title: '智能助手' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.meta.public) {
    next()
    return
  }

  const token = localStorage.getItem('token')
  const userStr = localStorage.getItem('user')

  if (!token || !userStr) {
    next('/login')
    return
  }

  const user = JSON.parse(userStr)

  if (to.meta.adminOnly && user.role !== 'admin') {
    next('/chat')
    return
  }

  next()
})

export default router