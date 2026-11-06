<template>
  <section class="chat-stage cosmos-stage">
    <div class="chat-hero">
      <div class="hero-copy">
        <p class="eyebrow">ORBITAL RAG CONSOLE</p>
        <h1>Hi, there!<br />How can I help you?</h1>
        <p class="hero-subtitle">
          面向航天知识问答、任务研判与资料检索的多模态智能副驾，支持文档理解、流式回答与引用追踪。
        </p>
      </div>

      <div class="hero-visual" aria-hidden="true">
        <div class="planet-core"></div>
        <div class="planet-ring ring-one"></div>
        <div class="planet-ring ring-two"></div>
        <div class="hero-earth"></div>
        <div class="hero-galaxy"></div>
        <div class="hero-satellite satellite-a">🛰️</div>
        <div class="hero-satellite satellite-b">🛰️</div>
        <div class="hero-rocket rocket-a">🚀</div>
        <div class="hero-rocket rocket-b">🚀</div>
        <div class="hero-astronaut">👨‍🚀</div>
        <div class="hero-robot">🤖</div>
        <span class="star-dot star-a"></span>
        <span class="star-dot star-b"></span>
        <span class="star-dot star-c"></span>
      </div>
    </div>

    <div class="chat-history" ref="historyRef">
      <div v-if="turns.length === 0" class="empty-chat empty-chat-cosmos">
        <div class="suggestion-grid">
          <button class="prompt-pill" v-for="p in prompts" :key="p" @click="usePrompt(p)">
            {{ p }}
          </button>
        </div>
      </div>

      <div v-for="turn in turns" :key="turn.id" class="turn-wrap">
        <div class="bubble-row user-row">
          <div class="bubble user-bubble">{{ turn.question }}</div>
        </div>

        <div class="bubble-row assistant-row">
          <div class="bubble assistant-bubble">
            <div>{{ turn.answer || (turn.status === 'streaming' ? '星舰正在思考中...' : '暂无回答') }}</div>
            <p v-if="turn.error" class="error bubble-error">{{ turn.error }}</p>

            <div class="image-gallery" v-if="turn.images.length > 0">
              <strong>相关图片</strong>
              <div class="image-grid">
                <a
                  v-for="image in turn.images"
                  :key="`${turn.id}-${image.image_id}`"
                  class="image-card"
                  :href="resolveImageUrl(image.image_url)"
                  target="_blank"
                  rel="noreferrer"
                >
                  <img :src="resolveImageUrl(image.image_url)" :alt="image.location_label" loading="lazy" />
                  <div class="image-meta">
                    <div class="image-title">{{ image.location_label }}</div>
                    <div class="image-source">{{ image.source_file }}</div>
                    <div class="image-caption" v-if="image.caption">{{ image.caption }}</div>
                  </div>
                </a>
              </div>
            </div>

            <div class="citation-box" v-if="turn.citations.length > 0">
              <strong>引用信息</strong>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>来源</th>
                    <th>页码</th>
                    <th>块位置</th>
                    <th>检索方式</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="c in turn.citations" :key="`${turn.id}-${c.index}-${c.chunk_id}-${c.image_id}`">
                    <td>{{ c.index }}</td>
                    <td>{{ c.source_file }}</td>
                    <td>{{ c.page_no ?? '-' }}</td>
                    <td>{{ c.chunk_location || c.location_label || '-' }}</td>
                    <td>{{ c.retrieval_method || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="chat-console">
      <div class="console-topbar">
        <div class="console-status-group">
          <span class="console-chip">当前会话：{{ currentSession?.title || '新建会话' }}</span>
          <label class="console-chip console-checkbox"><input type="checkbox" v-model="streamMode" /> 流式输出</label>
        </div>

        <div class="console-actions">
          <button class="secondary" v-if="loading && streamMode" @click="abortStreaming">停止回答</button>
          <button class="secondary" @click="clearSession" :disabled="loading || turns.length === 0">清空会话</button>
          <button class="secondary" @click="exportMarkdown" :disabled="turns.length === 0">导出 Markdown</button>
          <button class="secondary" @click="exportJson" :disabled="turns.length === 0">导出 JSON</button>
        </div>
      </div>

      <div class="chat-input-shell">
        <textarea v-model="question" placeholder="请输入聊天会话..." @keydown.enter.exact.prevent="handleAsk" />
        <div class="chat-input-foot">
          <p class="hint input-tip">建议输入任务背景、卫星通信问题、方案对比或文档总结需求。</p>
          <button class="send-btn" @click="handleAsk" :disabled="loading || !question.trim()">
            {{ loading ? '生成中...' : '➤' }}
          </button>
        </div>
      </div>

      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getApiBaseUrl } from "../api/http";
import { ask, streamAsk } from "../api/rag";
import type { AnswerImageItem, CitationItem } from "../types/rag";
import { extractErrorMessage } from "../utils/error";
import { useChatStore } from "../stores/chat";

const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();

const prompts = [
  "如何优化卫星通信，提高网络数据吞吐量？",
  "什么是卫星互联网，为什么被称为未来通信基础设施？",
  "什么是卫星互联网的核心优势？",
  "什么是卫星互联网，如何加速社会数字化转型？"
];

const question = ref("");
const streamMode = ref(true);
const loading = ref(false);
const error = ref("");
const historyRef = ref<HTMLElement | null>(null);
let streamController: AbortController | null = null;

const currentSessionId = computed(() => {
  const sid = typeof route.params.sessionId === "string" ? route.params.sessionId : "";
  if (sid) {
    return sid;
  }
  return chatStore.currentSessionId ?? "";
});

const currentSession = computed(() => {
  if (!currentSessionId.value) {
    return null;
  }
  return chatStore.getSessionById(currentSessionId.value);
});

const turns = computed(() => currentSession.value?.turns ?? []);

const ensureSessionFromRoute = () => {
  const sid = currentSessionId.value;
  if (sid) {
    chatStore.setCurrentSession(sid);
    return sid;
  }
  const session = chatStore.createSession();
  router.replace({ name: "chat", params: { sessionId: session.id } });
  return session.id;
};

watch(
  () => route.fullPath,
  () => {
    ensureSessionFromRoute();
  },
  { immediate: true }
);

watch(
  () => turns.value.length,
  async () => {
    await nextTick();
    if (historyRef.value) {
      historyRef.value.scrollTop = historyRef.value.scrollHeight;
    }
  }
);

const usePrompt = (p: string) => {
  question.value = p;
};

const resolveImageUrl = (imageUrl: string): string => {
  if (!imageUrl) {
    return "";
  }
  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }
  return `${getApiBaseUrl()}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`;
};

const clearSession = () => {
  if (!currentSessionId.value) {
    return;
  }
  chatStore.clearSessionTurns(currentSessionId.value);
  error.value = "";
};

const abortStreaming = () => {
  streamController?.abort();
};

const downloadFile = (name: string, content: string, mime = "text/plain;charset=utf-8") => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const exportMarkdown = () => {
  const session = currentSession.value;
  if (!session) {
    return;
  }
  const lines: string[] = [];
  lines.push(`# ${session.title}`);
  lines.push("");
  lines.push(`- 会话ID: ${session.id}`);
  lines.push(`- 创建时间: ${session.createdAt}`);
  lines.push(`- 更新时间: ${session.updatedAt}`);
  lines.push("");

  session.turns.forEach((turn, idx) => {
    lines.push(`## 轮次 ${idx + 1}`);
    lines.push("");
    lines.push(`### 用户`);
    lines.push(turn.question);
    lines.push("");
    lines.push(`### 助手`);
    lines.push(turn.answer || "(空)");
    lines.push("");
    lines.push(`### 状态`);
    lines.push(turn.status);
    lines.push("");

    if (turn.citations.length > 0) {
      lines.push(`### 引用`);
      turn.citations.forEach((c) => {
        lines.push(
          `- [${c.index}] ${c.source_file} | 页码: ${c.page_no ?? "-"} | 位置: ${c.chunk_location || c.location_label || "-"} | 方式: ${c.retrieval_method || "-"}`
        );
      });
      lines.push("");
    }

    if (turn.images.length > 0) {
      lines.push(`### 相关图片`);
      turn.images.forEach((image) => {
        lines.push(
          `- ${image.location_label} | 来源: ${image.source_file} | 地址: ${resolveImageUrl(image.image_url)}`
        );
      });
      lines.push("");
    }

    if (turn.error) {
      lines.push(`### 错误`);
      lines.push(turn.error);
      lines.push("");
    }
  });

  downloadFile(`${session.title}.md`, lines.join("\n"), "text/markdown;charset=utf-8");
};

const exportJson = () => {
  const session = currentSession.value;
  if (!session) {
    return;
  }
  downloadFile(
    `${session.title}.json`,
    JSON.stringify(session, null, 2),
    "application/json;charset=utf-8"
  );
};

const handleAsk = async () => {
  const q = question.value.trim();
  if (!q) {
    return;
  }

  const sid = ensureSessionFromRoute();
  error.value = "";
  loading.value = true;

  const turn = chatStore.appendTurn(sid, q);
  if (!turn) {
    loading.value = false;
    error.value = "会话不存在，请重试";
    return;
  }

  question.value = "";

  try {
    if (!streamMode.value) {
      const result = await ask({ question: q, stream: false });
      chatStore.updateTurn(sid, turn.id, {
        answer: result.answer,
        citations: result.citations,
        images: result.images,
        status: "done"
      });
      return;
    }

    streamController = new AbortController();
    await streamAsk(q, {
      signal: streamController.signal,
      onMessage: (msg) => {
        const session = chatStore.getSessionById(sid);
        const current = session?.turns.find((t) => t.id === turn.id);
        if (!current) {
          return;
        }
        if (msg.type === "token" && typeof msg.content === "string") {
          chatStore.updateTurn(sid, turn.id, { answer: current.answer + msg.content });
        }
        if (msg.type === "citations" && Array.isArray(msg.content)) {
          chatStore.updateTurn(sid, turn.id, { citations: msg.content as CitationItem[] });
        }
        if (msg.type === "images" && Array.isArray(msg.content)) {
          chatStore.updateTurn(sid, turn.id, { images: msg.content as AnswerImageItem[] });
        }
        if (msg.type === "done") {
          chatStore.updateTurn(sid, turn.id, { status: "done" });
        }
      }
    });

    const session = chatStore.getSessionById(sid);
    const current = session?.turns.find((t) => t.id === turn.id);
    if (current?.status === "streaming") {
      chatStore.updateTurn(sid, turn.id, { status: "done" });
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      chatStore.updateTurn(sid, turn.id, {
        status: "aborted",
        error: "本轮已手动停止"
      });
    } else {
      const msg = extractErrorMessage(err);
      chatStore.updateTurn(sid, turn.id, {
        status: "error",
        error: msg
      });
      error.value = msg;
    }
  } finally {
    loading.value = false;
    streamController = null;
  }
};
</script>
