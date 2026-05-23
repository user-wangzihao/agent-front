<template>
    <div class="admin-layout">
      <!-- 侧边栏 -->
      <div :class="['admin-sidebar', { collapsed: sidebarCollapsed }]">
        <!-- Logo区域 -->
        <div class="sidebar-logo">
          <span class="logo-icon">🤖</span>
          <span v-if="!sidebarCollapsed" class="logo-text">AgentDemo</span>
        </div>
  
        <!-- 导航菜单 -->
        <el-menu
          :default-active="activeMenu"
          :collapse="sidebarCollapsed"
          :collapse-transition="false"
          router
          background-color="#1a1d2e"
          text-color="#a0a9c0"
          active-text-color="#ffffff"
          class="sidebar-menu"
        >
          <el-menu-item index="/dashboard">
            <el-icon><DataAnalysis /></el-icon>
            <template #title>运营大屏</template>
          </el-menu-item>

          <el-menu-item index="/documents">
            <el-icon><Document /></el-icon>
            <template #title>功能文档</template>
          </el-menu-item>
  
          <el-menu-item index="/faq">
            <el-icon><ChatLineRound /></el-icon>
            <template #title>FAQ 管理</template>
          </el-menu-item>

          <el-menu-item index="/faq-candidate">
            <el-icon><Collection /></el-icon>
            <template #title>FAQ 候选审核</template>
          </el-menu-item>
        </el-menu>
  
        <!-- 底部操作区 -->
        <div class="sidebar-footer">
          <div class="user-info" v-if="!sidebarCollapsed">
            <span class="user-name">{{ userInfo?.nickname || userInfo?.username }}</span>
            <el-tag size="small" type="danger">管理员</el-tag>
          </div>
          <div class="footer-actions">
            <el-tooltip :content="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'" placement="right">
              <el-button text class="collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed">
                <el-icon><component :is="sidebarCollapsed ? Expand : Fold" /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="前往智能助手" placement="right">
              <el-button text class="collapse-btn" @click="$router.push('/chat')">
                <el-icon><Service /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="退出登录" placement="right">
              <el-button text class="collapse-btn" @click="handleLogout">
                <el-icon><SwitchButton /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
        </div>
      </div>
  
      <!-- 主内容区 -->
      <div class="admin-main">
        <!-- 顶部导航栏 -->
        <div class="admin-topbar">
          <div class="topbar-title">{{ currentPageTitle }}</div>
          <div class="topbar-right">
            <span class="topbar-user">{{ userInfo?.nickname || userInfo?.username }}</span>
          </div>
        </div>
  
        <!-- 页面内容 -->
        <div class="admin-content">
          <router-view />
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { computed, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ElMessageBox } from 'element-plus'
  import {
    Document, ChatLineRound, Fold, Expand, Service, SwitchButton, Collection, DataAnalysis
  } from '@element-plus/icons-vue'
  
  const route = useRoute()
  const router = useRouter()
  const sidebarCollapsed = ref(false)
  
  const userInfo = computed(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  
  const activeMenu = computed(() => {
    if (route.path.startsWith('/dashboard')) return '/dashboard'
    if (route.path.startsWith('/document')) return '/documents'
    if (route.path.startsWith('/faq-candidate')) return '/faq-candidate'
    if (route.path.startsWith('/faq')) return '/faq'
    return route.path
  })
  
  const currentPageTitle = computed(() => {
    const titleMap = {
      '/dashboard': '运营大屏',
      '/documents': '功能文档管理',
      '/faq': 'FAQ 管理',
      '/faq-candidate': 'FAQ 候选审核',
    }
    if (route.path.startsWith('/document/add')) return '新增功能文档'
    if (route.path.startsWith('/document/edit')) return '编辑功能文档'
    if (route.path.startsWith('/document/detail')) return '文档详情'
    return titleMap[route.path] || '管理后台'
  })
  
  async function handleLogout() {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }
  </script>
  
  <style scoped>
  .admin-layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
    background: #f4f6f9;
  }
  
  /* ===== 侧边栏 ===== */
  .admin-sidebar {
    width: 220px;
    min-width: 220px;
    background: #1a1d2e;
    display: flex;
    flex-direction: column;
    transition: width 0.25s ease, min-width 0.25s ease;
    overflow: hidden;
  }
  
  .admin-sidebar.collapsed {
    width: 64px;
    min-width: 64px;
  }
  
  .sidebar-logo {
    height: 60px;
    display: flex;
    align-items: center;
    padding: 0 20px;
    gap: 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    overflow: hidden;
    white-space: nowrap;
  }
  
  .logo-icon { font-size: 22px; flex-shrink: 0; }
  .logo-text { font-size: 16px; font-weight: 700; color: #ffffff; }
  
  .sidebar-menu {
    flex: 1;
    border: none !important;
    overflow-y: auto;
    overflow-x: hidden;
  }
  
  /* 覆盖 el-menu 默认样式 */
  .sidebar-menu :deep(.el-menu-item) {
    height: 48px;
    border-radius: 8px;
    margin: 4px 8px;
    width: calc(100% - 16px);
  }
  
  .sidebar-menu :deep(.el-menu-item.is-active) {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    color: #ffffff !important;
  }
  
  .sidebar-menu :deep(.el-menu-item:hover) {
    background: rgba(255, 255, 255, 0.08) !important;
  }
  
  /* 折叠状态下修正图标居中 */
  .admin-sidebar.collapsed .sidebar-menu :deep(.el-menu-item) {
    margin: 4px auto;
    width: 48px;
    padding: 0 !important;
    justify-content: center;
  }
  
  .sidebar-footer {
    padding: 12px 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
  
  .user-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px 8px;
  }
  
  .user-name {
    font-size: 13px;
    color: #a0a9c0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .footer-actions {
    display: flex;
    gap: 4px;
    justify-content: flex-start;
  }
  
  .collapse-btn {
    width: 36px;
    height: 36px;
    color: #a0a9c0 !important;
    border-radius: 8px;
  }
  
  .collapse-btn:hover {
    background: rgba(255, 255, 255, 0.1) !important;
    color: #ffffff !important;
  }
  
  /* ===== 主内容区 ===== */
  .admin-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .admin-topbar {
    height: 60px;
    background: #ffffff;
    border-bottom: 1px solid #ebeef5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    flex-shrink: 0;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  }
  
  .topbar-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }
  
  .topbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .topbar-user {
    font-size: 14px;
    color: #606266;
  }
  
  .admin-content {
    flex: 1;
    overflow-y: auto;
    padding: 0;
  }
  </style>