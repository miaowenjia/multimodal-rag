<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <div class="sidebar-glow sidebar-glow-top"></div>
      <div class="sidebar-glow sidebar-glow-bottom"></div>

      <section class="sidebar-brand card-panel">
        <div class="brand-topbar">
          <button class="launch-btn" @click="createNewChat">
            <span class="launch-icon">＋</span>
            <span>新建聊天会话</span>
          </button>
          <button class="brand-square-btn" @click="goImportDocs" aria-label="导入文档">
            ↗
          </button>
        </div>

        <div class="brand-gallery" aria-hidden="true">
          <div class="brand-orbit orbit-large"></div>
          <div class="brand-orbit orbit-small"></div>
          <div class="brand-badge">🚀</div>
          <div class="brand-badge">🛰️</div>
          <div class="brand-badge">🔭</div>
        </div>
      </section>

      <section class="sidebar-middle">
        <div class="session-head">
          <span>会话航迹</span>
          <span class="hint session-count">{{ filteredSessions.length }}</span>
        </div>

        <input
          v-model="searchText"
          class="session-search"
          placeholder="搜索任务主题"
          aria-label="搜索会话"
        />

        <div class="session-list-layout">
          <div class="session-list">
            <div
              v-for="session in filteredSessions"
              :key="session.id"
              class="session-item"
              :class="{ active: isCurrentSession(session.id) }"
            >
              <div class="session-row">
                <button class="session-main-btn" @click="openSession(session.id)">
                  <span class="session-title">{{ session.title }}</span>
                  <span class="session-time">{{ formatTime(session.updatedAt) }}</span>
                </button>

                <div class="session-menu-wrap">
                  <button class="session-ellipsis" @click.stop="toggleMenu(session.id)">⋯</button>
                  <div
                    class="session-menu"
                    v-if="openMenuId === session.id"
                    @click.stop
                  >
                    <button class="session-menu-item" @click="renameSession(session.id)">重命名</button>
                    <button class="session-menu-item danger" @click="removeSession(session.id)">删除</button>
                  </div>
                </div>
              </div>
            </div>

            <p v-if="filteredSessions.length === 0" class="hint empty-session-text">暂无匹配会话</p>
          </div>
        </div>
      </section>

      <div class="sidebar-bottom-fixed">
        <button class="side-link-btn" @click="goImportDocs">文档管理</button>
        <button class="side-link-btn side-link-btn-muted" @click="goSettings">系统设置</button>
      </div>
    </aside>

    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useChatStore } from "./stores/chat";

const router = useRouter();
const route = useRoute();
const chatStore = useChatStore();

const searchText = ref("");
const openMenuId = ref<string | null>(null);

const sortedSessions = computed(() => chatStore.sortedSessions);
const filteredSessions = computed(() => {
  const keyword = searchText.value.trim().toLowerCase();
  if (!keyword) {
    return sortedSessions.value;
  }
  return sortedSessions.value.filter((s) => s.title.toLowerCase().includes(keyword));
});

const closeMenu = () => {
  openMenuId.value = null;
};

const onDocumentClick = () => {
  closeMenu();
};

onMounted(() => {
  document.addEventListener("click", onDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick);
});

const normalizeSessionFromRoute = () => {
  if (route.name !== "chat") {
    return;
  }
  const routeSessionId = typeof route.params.sessionId === "string" ? route.params.sessionId : "";
  if (routeSessionId) {
    chatStore.setCurrentSession(routeSessionId);
    return;
  }
  const session = chatStore.ensureSession();
  router.replace({ name: "chat", params: { sessionId: session.id } });
};

watch(
  () => route.fullPath,
  () => {
    normalizeSessionFromRoute();
    closeMenu();
  },
  { immediate: true }
);

const toggleMenu = (sessionId: string) => {
  openMenuId.value = openMenuId.value === sessionId ? null : sessionId;
};

const openSession = (sessionId: string) => {
  chatStore.setCurrentSession(sessionId);
  router.push({ name: "chat", params: { sessionId } });
};

const createNewChat = () => {
  const created = chatStore.createSession();
  router.push({ name: "chat", params: { sessionId: created.id } });
};

const renameSession = (sessionId: string) => {
  const target = chatStore.getSessionById(sessionId);
  if (!target) {
    return;
  }
  const value = window.prompt("请输入新的会话名称", target.title);
  if (value === null) {
    return;
  }
  chatStore.renameSession(sessionId, value);
  closeMenu();
};

const removeSession = (sessionId: string) => {
  const target = chatStore.getSessionById(sessionId);
  if (!target) {
    return;
  }
  const ok = window.confirm(`确认删除会话“${target.title}”吗？`);
  if (!ok) {
    return;
  }
  const nextId = chatStore.deleteSession(sessionId);
  closeMenu();
  if (route.name === "chat") {
    router.push({ name: "chat", params: { sessionId: nextId } });
  }
};

const goImportDocs = () => {
  router.push({ name: "documents" });
};

const goSettings = () => {
  router.push({ name: "settings" });
};

const isCurrentSession = (id: string) => chatStore.currentSessionId === id;

const formatTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleDateString();
};
</script>
