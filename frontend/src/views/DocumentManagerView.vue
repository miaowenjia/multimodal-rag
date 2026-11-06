<template>
  <div class="space-page doc-page">
    <section class="space-hero card">
      <div class="space-hero-copy">
        <p class="space-kicker">MISSION CONTROL · DOCUMENT HUB</p>
        <h1>文档管理中心</h1>
        <p class="space-lead">
          统一管理知识库文档上传、健康检查、索引状态与替换删除操作，构建面向航天问答场景的资料中枢。
        </p>
      </div>

      <div class="space-orbit-board" aria-hidden="true">
        <div class="mini-planet"></div>
        <div class="mini-ring"></div>
        <div class="mini-ring mini-ring-2"></div>
        <div class="mini-node mini-node-a"></div>
        <div class="mini-node mini-node-b"></div>
        <div class="mini-node mini-node-c"></div>
      </div>
    </section>

    <section class="card space-panel-section">
      <div class="panel-head space-panel-head">
        <div>
          <p class="space-section-tag">LINK STATUS</p>
          <h2>基础连通与状态</h2>
        </div>
        <span v-if="healthStatus" class="status-pill" :class="healthStatus === 'ok' ? 'status-ok' : 'status-error'">
          {{ healthStatus === "ok" ? "后端在线" : `异常：${healthStatus}` }}
        </span>
      </div>

      <div class="space-form-grid health-grid">
        <label class="space-field span-2">
          <span>后端地址</span>
          <input v-model="baseUrlInput" />
        </label>

        <div class="space-action-row">
          <button @click="saveBaseUrl">保存地址</button>
          <button class="secondary" @click="checkHealth" :disabled="healthLoading">
            {{ healthLoading ? "检查中..." : "GET /api/health" }}
          </button>
        </div>
      </div>
    </section>

    <section class="card space-panel-section">
      <div class="panel-head space-panel-head">
        <div>
          <p class="space-section-tag">INGEST PIPELINE</p>
          <h2>文档上传与入库</h2>
        </div>
      </div>

      <div class="space-form-grid upload-grid">
        <label class="space-field span-2">
          <span>选择文件</span>
          <input ref="uploadInputRef" type="file" multiple accept=".pdf,.doc,.docx" @change="onFilesChange" />
        </label>

        <label class="space-check-field">
          <input type="checkbox" v-model="overwrite" />
          <span>覆盖同名文档</span>
        </label>

        <div class="space-action-row">
          <button @click="handleUpload" :disabled="uploading || selectedFiles.length === 0">
            {{ uploading ? "上传处理中..." : `POST /api/rag/ingest (${selectedFiles.length})` }}
          </button>
          <button class="secondary" @click="clearUploadSelection" :disabled="uploading || selectedFiles.length === 0">
            清空已选
          </button>
        </div>
      </div>

      <div class="space-inline-meta">
        <span class="hint">仅支持 .pdf / .doc / .docx</span>
        <span class="hint">请求字段：files[] + overwrite</span>
      </div>
      <p v-if="uploadError" class="error">{{ uploadError }}</p>

      <div v-if="uploadResult" class="space-result-block">
        <div class="space-stats-strip">
          <div class="stat-chip">总数 {{ uploadResult.total }}</div>
          <div class="stat-chip success-chip">成功 {{ uploadResult.succeeded }}</div>
          <div class="stat-chip danger-chip">失败 {{ uploadResult.failed }}</div>
        </div>

        <div class="row filter-row">
          <button class="secondary" :disabled="uploadFilter === 'all'" @click="uploadFilter = 'all'">全部</button>
          <button class="secondary" :disabled="uploadFilter === 'success'" @click="uploadFilter = 'success'">仅成功</button>
          <button class="secondary" :disabled="uploadFilter === 'failed'" @click="uploadFilter = 'failed'">仅失败</button>
        </div>

        <div class="space-table-wrap">
          <table>
            <thead>
              <tr>
                <th>文件名</th>
                <th>状态</th>
                <th>文档ID</th>
                <th>父块/子块/图片</th>
                <th>重复/覆盖</th>
                <th>错误信息</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredUploadItems" :key="item.file_name + String(item.document_id)">
                <td>{{ item.file_name }}</td>
                <td>
                  <span class="status-pill" :class="item.success ? 'status-ok' : 'status-error'">
                    {{ item.success ? "成功" : "失败" }}
                  </span>
                </td>
                <td>{{ item.document_id ?? "-" }}</td>
                <td>{{ item.parent_chunks }}/{{ item.child_chunks }}/{{ item.images }}</td>
                <td>{{ item.already_exists ? "已存在" : "新文件" }} / {{ item.overwritten ? "已覆盖" : "未覆盖" }}</td>
                <td class="error">{{ item.error ?? "-" }}</td>
              </tr>
              <tr v-if="filteredUploadItems.length === 0">
                <td colspan="6">当前筛选下无结果</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="card space-panel-section">
      <div class="panel-head space-panel-head">
        <div>
          <p class="space-section-tag">DOCUMENT REGISTRY</p>
          <h2>知识库文档列表</h2>
        </div>
        <button class="secondary" @click="loadDocuments" :disabled="listLoading">
          {{ listLoading ? "刷新中..." : "刷新列表" }}
        </button>
      </div>

      <p v-if="listError" class="error">{{ listError }}</p>

      <div class="space-table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>文件名</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>替换文件（PUT）</th>
              <th>删除（DELETE）</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="doc in documents" :key="doc.id">
              <td>{{ doc.id }}</td>
              <td>{{ doc.file_name }}</td>
              <td><span class="badge" :class="statusClass(doc.status)">{{ doc.status }}</span></td>
              <td>{{ formatDate(doc.created_at) }}</td>
              <td>
                <div class="replace-cell">
                  <input type="file" accept=".pdf,.doc,.docx" @change="(e) => onReplaceSelected(e, doc.id)" />
                  <button @click="handleReplace(doc.id)" :disabled="!replaceFiles[doc.id] || replacingId === doc.id">
                    {{ replacingId === doc.id ? "更新中..." : "PUT /api/rag/documents/{id}" }}
                  </button>
                </div>
              </td>
              <td>
                <button class="secondary" @click="handleDelete(doc.id)" :disabled="deletingId === doc.id">
                  {{ deletingId === doc.id ? "删除中..." : "DELETE /api/rag/documents/{id}" }}
                </button>
              </td>
            </tr>
            <tr v-if="documents.length === 0">
              <td colspan="6">暂无文档</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  deleteDocument,
  getDocuments,
  getHealth,
  ingestDocuments,
  updateDocument
} from "../api/rag";
import { getApiBaseUrl, setApiBaseUrl } from "../api/http";
import type { BatchIngestResponse, DocumentListItem, IngestItem } from "../types/rag";
import { extractErrorMessage } from "../utils/error";

const allowedExtensions = ["pdf", "doc", "docx"];

const baseUrlInput = ref(getApiBaseUrl());
const healthStatus = ref("");
const healthLoading = ref(false);

const selectedFiles = ref<File[]>([]);
const overwrite = ref(false);
const uploading = ref(false);
const uploadError = ref("");
const uploadResult = ref<BatchIngestResponse | null>(null);
const uploadFilter = ref<"all" | "success" | "failed">("all");
const uploadInputRef = ref<HTMLInputElement | null>(null);

const listLoading = ref(false);
const listError = ref("");
const documents = ref<DocumentListItem[]>([]);
const deletingId = ref<number | null>(null);
const replacingId = ref<number | null>(null);
const replaceFiles = ref<Record<number, File | undefined>>({});

const getExt = (name: string): string => {
  const arr = name.toLowerCase().split(".");
  return arr.length > 1 ? arr[arr.length - 1] : "";
};

const isSupported = (file: File): boolean => {
  return allowedExtensions.includes(getExt(file.name));
};

const filteredUploadItems = computed<IngestItem[]>(() => {
  if (!uploadResult.value) return [];
  if (uploadFilter.value === "all") return uploadResult.value.items;
  if (uploadFilter.value === "success") return uploadResult.value.items.filter((x) => x.success);
  return uploadResult.value.items.filter((x) => !x.success);
});

const statusClass = (status: string): string => {
  if (status === "ready") return "badge-ready";
  if (status === "processing" || status === "uploaded") return "badge-processing";
  return "badge-unknown";
};

const formatDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
};

const saveBaseUrl = () => {
  setApiBaseUrl(baseUrlInput.value);
  healthStatus.value = "";
};

const checkHealth = async () => {
  healthLoading.value = true;
  try {
    const result = await getHealth();
    healthStatus.value = result.status;
  } catch (err) {
    healthStatus.value = extractErrorMessage(err);
  } finally {
    healthLoading.value = false;
  }
};

const clearUploadSelection = () => {
  selectedFiles.value = [];
  if (uploadInputRef.value) uploadInputRef.value.value = "";
};

const onFilesChange = (event: Event) => {
  uploadError.value = "";
  const input = event.target as HTMLInputElement;
  const files = input.files ? Array.from(input.files) : [];
  const invalid = files.filter((f) => !isSupported(f));
  if (invalid.length > 0) {
    selectedFiles.value = [];
    uploadError.value = `仅支持 .pdf/.doc/.docx，以下文件不合法：${invalid.map((x) => x.name).join("，")}`;
    if (uploadInputRef.value) uploadInputRef.value.value = "";
    return;
  }
  selectedFiles.value = files;
};

const handleUpload = async () => {
  if (selectedFiles.value.length === 0) return;
  uploading.value = true;
  uploadError.value = "";
  try {
    uploadResult.value = await ingestDocuments(selectedFiles.value, overwrite.value);
    uploadFilter.value = "all";
    clearUploadSelection();
    await loadDocuments();
  } catch (err) {
    uploadError.value = extractErrorMessage(err);
  } finally {
    uploading.value = false;
  }
};

const loadDocuments = async () => {
  listLoading.value = true;
  listError.value = "";
  try {
    const list = await getDocuments();
    documents.value = [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch (err) {
    listError.value = extractErrorMessage(err);
  } finally {
    listLoading.value = false;
  }
};

const onReplaceSelected = (event: Event, documentId: number) => {
  listError.value = "";
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!isSupported(file)) {
    replaceFiles.value[documentId] = undefined;
    listError.value = `替换文件仅支持 .pdf/.doc/.docx，当前文件：${file.name}`;
    input.value = "";
    return;
  }
  replaceFiles.value[documentId] = file;
};

const handleReplace = async (documentId: number) => {
  const file = replaceFiles.value[documentId];
  if (!file) return;
  replacingId.value = documentId;
  try {
    await updateDocument(documentId, file);
    replaceFiles.value[documentId] = undefined;
    await loadDocuments();
  } catch (err) {
    listError.value = extractErrorMessage(err);
  } finally {
    replacingId.value = null;
  }
};

const handleDelete = async (documentId: number) => {
  const ok = window.confirm(`确认删除文档 ID ${documentId} 吗？`);
  if (!ok) return;
  deletingId.value = documentId;
  try {
    await deleteDocument(documentId);
    await loadDocuments();
  } catch (err) {
    listError.value = extractErrorMessage(err);
  } finally {
    deletingId.value = null;
  }
};

onMounted(async () => {
  await checkHealth();
  await loadDocuments();
});
</script>
