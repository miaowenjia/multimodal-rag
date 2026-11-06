<template>
  <div class="space-page settings-page">
    <section class="space-hero card">
      <div class="space-hero-copy">
        <p class="space-kicker">MISSION CONTROL · SYSTEM TUNING</p>
        <h1>系统设置总控台</h1>
        <p class="space-lead">
          面向模型、重排与检索参数的统一调度界面，让整个 RAG 航天问答系统以可视化方式快速完成配置校准。
        </p>
      </div>

      <div class="space-orbit-board settings-orbit-board" aria-hidden="true">
        <div class="mini-planet settings-core"></div>
        <div class="mini-ring"></div>
        <div class="mini-ring mini-ring-2"></div>
        <div class="signal-bar signal-a"></div>
        <div class="signal-bar signal-b"></div>
        <div class="signal-bar signal-c"></div>
      </div>
    </section>

    <section class="card space-panel-section">
      <div class="panel-head space-panel-head">
        <div>
          <p class="space-section-tag">OVERVIEW SYNC</p>
          <h2>系统配置总览</h2>
        </div>
        <button class="secondary" @click="loadAll" :disabled="loadingAll">
          {{ loadingAll ? "读取中..." : "读取配置总览" }}
        </button>
      </div>

      <p class="hint space-copy-block">
        当前后端已经实现并开放以下系统设置接口：
        <code>/api/rag/config/model</code>、<code>/api/rag/config/reranker</code>、<code>/api/rag/config/retrieval</code>、<code>/api/rag/config/all</code>。
        本页现在可以直接联调，配置保存后新请求通常可直接按新配置生效。
      </p>
      <p v-if="globalMessage" :class="globalIsError ? 'error' : 'success'">{{ globalMessage }}</p>
    </section>

    <section class="card space-panel-section">
      <div class="panel-head space-panel-head">
        <div>
          <p class="space-section-tag">MODEL CONFIG</p>
          <h2>模型配置</h2>
        </div>
        <div class="row">
          <button class="secondary" @click="loadModelConfig" :disabled="loadingModel">
            {{ loadingModel ? "读取中..." : "读取" }}
          </button>
          <button @click="saveModelConfig" :disabled="savingModel">{{ savingModel ? "保存中..." : "保存" }}</button>
        </div>
      </div>

      <div class="space-subtitle">/api/rag/config/model</div>
      <div class="form-grid space-form-grid">
        <label class="space-field">LLM API Base<input v-model="modelForm.llm.api_base" /></label>
        <label class="space-field">LLM API Key<input v-model="modelForm.llm.api_key" type="password" /></label>
        <label class="space-field">LLM 模型名<input v-model="modelForm.llm.model_name" /></label>
        <label class="space-field">LLM 超时(秒)<input v-model.number="modelForm.llm.timeout" type="number" min="1" /></label>

        <label class="space-field">Embedding API Base<input v-model="modelForm.embedding.api_base" /></label>
        <label class="space-field">Embedding API Key<input v-model="modelForm.embedding.api_key" type="password" /></label>
        <label class="space-field">Embedding 模型名<input v-model="modelForm.embedding.model_name" /></label>

        <label class="space-check-field">
          <input type="checkbox" v-model="modelForm.vision.enabled" />
          <span>启用视觉模型</span>
        </label>
        <label class="space-field">Vision API Base<input v-model="modelForm.vision.api_base" /></label>
        <label class="space-field">Vision API Key<input v-model="modelForm.vision.api_key" type="password" /></label>
        <label class="space-field">Vision 模型名<input v-model="modelForm.vision.model_name" /></label>
      </div>
      <p v-if="modelMessage" :class="modelError ? 'error' : 'success'">{{ modelMessage }}</p>
    </section>

    <section class="card space-panel-section">
      <div class="panel-head space-panel-head">
        <div>
          <p class="space-section-tag">RERANKER CONFIG</p>
          <h2>Reranker 配置</h2>
        </div>
        <div class="row">
          <button class="secondary" @click="loadRerankerConfig" :disabled="loadingReranker">
            {{ loadingReranker ? "读取中..." : "读取" }}
          </button>
          <button @click="saveRerankerConfig" :disabled="savingReranker">{{ savingReranker ? "保存中..." : "保存" }}</button>
        </div>
      </div>

      <div class="space-subtitle">/api/rag/config/reranker</div>
      <p class="hint space-copy-block">
        Reranker 现已改为 OpenAI-compatible 配置结构，可直接对接云端或本地部署的兼容接口。
      </p>
      <div class="form-grid space-form-grid">
        <label class="space-check-field">
          <input type="checkbox" v-model="rerankerForm.enabled" />
          <span>启用 Reranker</span>
        </label>
        <label class="space-field">Reranker API Base<input v-model="rerankerForm.config.api_base" /></label>
        <label class="space-field">Reranker API Key<input v-model="rerankerForm.config.api_key" type="password" /></label>
        <label class="space-field">Reranker 模型名<input v-model="rerankerForm.config.model_name" /></label>
        <label class="space-field">Reranker 超时(秒)<input v-model.number="rerankerForm.config.timeout" type="number" min="1" /></label>
      </div>
      <p v-if="rerankerMessage" :class="rerankerError ? 'error' : 'success'">{{ rerankerMessage }}</p>
    </section>

    <section class="card space-panel-section">
      <div class="panel-head space-panel-head">
        <div>
          <p class="space-section-tag">RETRIEVAL CONFIG</p>
          <h2>检索参数</h2>
        </div>
        <div class="row">
          <button class="secondary" @click="loadRetrievalConfig" :disabled="loadingRetrieval">
            {{ loadingRetrieval ? "读取中..." : "读取" }}
          </button>
          <button @click="saveRetrievalConfig" :disabled="savingRetrieval">{{ savingRetrieval ? "保存中..." : "保存" }}</button>
        </div>
      </div>

      <div class="space-subtitle">/api/rag/config/retrieval</div>
      <div class="form-grid space-form-grid narrow-grid">
        <label class="space-field">top_k<input v-model.number="retrievalForm.top_k" type="number" min="1" max="100" /></label>
        <label class="space-field">keyword_top_k<input v-model.number="retrievalForm.keyword_top_k" type="number" min="1" max="100" /></label>
        <label class="space-field">final_top_n<input v-model.number="retrievalForm.final_top_n" type="number" min="1" /></label>
      </div>
      <p v-if="retrievalHint" class="hint">{{ retrievalHint }}</p>
      <p v-if="retrievalMessage" :class="retrievalError ? 'error' : 'success'">{{ retrievalMessage }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import {
  getConfigAll,
  getModelConfig,
  getRerankerConfig,
  getRetrievalConfig,
  updateModelConfig,
  updateRerankerConfig,
  updateRetrievalConfig
} from "../api/rag";
import { extractErrorMessage } from "../utils/error";

const loadingAll = ref(false);
const loadingModel = ref(false);
const loadingReranker = ref(false);
const loadingRetrieval = ref(false);
const savingModel = ref(false);
const savingReranker = ref(false);
const savingRetrieval = ref(false);

const globalMessage = ref("");
const globalIsError = ref(false);

const modelMessage = ref("");
const modelError = ref(false);
const rerankerMessage = ref("");
const rerankerError = ref(false);
const retrievalMessage = ref("");
const retrievalError = ref(false);
const retrievalHint = ref("参数越大通常召回更全，但延迟也可能更高。建议结合业务压测调整。");

const modelForm = reactive({
  llm: {
    api_base: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    api_key: "",
    model_name: "qwen-plus",
    timeout: 120
  },
  embedding: {
    api_base: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    api_key: "",
    model_name: "text-embedding-v3"
  },
  vision: {
    enabled: false,
    api_base: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    api_key: "",
    model_name: "qwen-vl-max-latest"
  }
});

const rerankerForm = reactive({
  enabled: true,
  config: {
    api_base: "",
    api_key: "",
    model_name: "",
    timeout: 60
  }
});

const retrievalForm = reactive({
  top_k: 15,
  keyword_top_k: 15,
  final_top_n: 8
});

const isUnimplementedError = (msg: string): boolean => {
  const lower = msg.toLowerCase();
  return lower.includes("404") || lower.includes("405") || lower.includes("not found") || lower.includes("未找到") || lower.includes("not implemented");
};

const setGlobal = (msg: string, isError: boolean) => {
  globalMessage.value = msg;
  globalIsError.value = isError;
};

const loadAll = async () => {
  loadingAll.value = true;
  try {
    const all = await getConfigAll();
    Object.assign(modelForm.llm, all.model.llm);
    Object.assign(modelForm.embedding, all.model.embedding);
    Object.assign(modelForm.vision, all.model.vision);
    rerankerForm.enabled = all.reranker.enabled;
    Object.assign(rerankerForm.config, all.reranker.config);
    Object.assign(retrievalForm, all.retrieval);
    setGlobal("配置总览读取成功。", false);
  } catch (err) {
    const msg = extractErrorMessage(err);
    if (isUnimplementedError(msg)) {
      setGlobal("配置总览读取失败，请确认后端服务已启动且接口可访问。", true);
    } else {
      setGlobal(msg, true);
    }
  } finally {
    loadingAll.value = false;
  }
};

const loadModelConfig = async () => {
  loadingModel.value = true;
  modelMessage.value = "";
  try {
    const cfg = await getModelConfig();
    Object.assign(modelForm.llm, cfg.llm);
    Object.assign(modelForm.embedding, cfg.embedding);
    Object.assign(modelForm.vision, cfg.vision);
    modelError.value = false;
    modelMessage.value = "模型配置读取成功。";
  } catch (err) {
    const msg = extractErrorMessage(err);
    modelError.value = true;
    modelMessage.value = isUnimplementedError(msg)
      ? "/api/rag/config/model 请求失败，请确认后端接口可访问。"
      : msg;
  } finally {
    loadingModel.value = false;
  }
};

const saveModelConfig = async () => {
  savingModel.value = true;
  modelMessage.value = "";
  try {
    const result = await updateModelConfig({
      llm: { ...modelForm.llm },
      embedding: { ...modelForm.embedding },
      vision: { ...modelForm.vision },
      apply_mode: "persist_and_reload"
    });
    modelError.value = false;
    modelMessage.value = result.message || "模型配置已提交。";
  } catch (err) {
    const msg = extractErrorMessage(err);
    modelError.value = true;
    modelMessage.value = isUnimplementedError(msg)
      ? "/api/rag/config/model 保存失败，请确认后端接口可访问。"
      : msg;
  } finally {
    savingModel.value = false;
  }
};

const loadRerankerConfig = async () => {
  loadingReranker.value = true;
  rerankerMessage.value = "";
  try {
    const cfg = await getRerankerConfig();
    rerankerForm.enabled = cfg.enabled;
    Object.assign(rerankerForm.config, cfg.config);
    rerankerError.value = false;
    rerankerMessage.value = "Reranker 配置读取成功。";
  } catch (err) {
    const msg = extractErrorMessage(err);
    rerankerError.value = true;
    rerankerMessage.value = isUnimplementedError(msg)
      ? "/api/rag/config/reranker 请求失败，请确认后端接口可访问。"
      : msg;
  } finally {
    loadingReranker.value = false;
  }
};

const saveRerankerConfig = async () => {
  savingReranker.value = true;
  rerankerMessage.value = "";
  try {
    const result = await updateRerankerConfig({
      enabled: rerankerForm.enabled,
      config: { ...rerankerForm.config },
      apply_mode: "persist_and_reload"
    });
    rerankerError.value = false;
    rerankerMessage.value = result.message || "Reranker 配置已提交。";
  } catch (err) {
    const msg = extractErrorMessage(err);
    rerankerError.value = true;
    rerankerMessage.value = isUnimplementedError(msg)
      ? "/api/rag/config/reranker 保存失败，请确认后端接口可访问。"
      : msg;
  } finally {
    savingReranker.value = false;
  }
};

const loadRetrievalConfig = async () => {
  loadingRetrieval.value = true;
  retrievalMessage.value = "";
  try {
    const cfg = await getRetrievalConfig();
    Object.assign(retrievalForm, cfg);
    retrievalError.value = false;
    retrievalMessage.value = "检索参数读取成功。";
  } catch (err) {
    const msg = extractErrorMessage(err);
    retrievalError.value = true;
    retrievalMessage.value = isUnimplementedError(msg)
      ? "/api/rag/config/retrieval 请求失败，请确认后端接口可访问。"
      : msg;
  } finally {
    loadingRetrieval.value = false;
  }
};

const saveRetrievalConfig = async () => {
  savingRetrieval.value = true;
  retrievalMessage.value = "";
  try {
    const result = await updateRetrievalConfig({
      ...retrievalForm,
      apply_mode: "persist_and_reload"
    });
    retrievalError.value = false;
    retrievalMessage.value = result.message || "检索参数已提交。";
  } catch (err) {
    const msg = extractErrorMessage(err);
    retrievalError.value = true;
    retrievalMessage.value = isUnimplementedError(msg)
      ? "/api/rag/config/retrieval 保存失败，请确认后端接口可访问。"
      : msg;
  } finally {
    savingRetrieval.value = false;
  }
};

onMounted(() => {
  loadAll();
});
</script>
