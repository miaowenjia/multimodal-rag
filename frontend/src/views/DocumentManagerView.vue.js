import { computed, onMounted, ref } from "vue";
import { deleteDocument, getDocuments, getHealth, ingestDocuments, updateDocument } from "../api/rag";
import { getApiBaseUrl, setApiBaseUrl } from "../api/http";
import { extractErrorMessage } from "../utils/error";
const allowedExtensions = ["pdf", "doc", "docx"];
const baseUrlInput = ref(getApiBaseUrl());
const healthStatus = ref("");
const healthLoading = ref(false);
const selectedFiles = ref([]);
const overwrite = ref(false);
const uploading = ref(false);
const uploadError = ref("");
const uploadResult = ref(null);
const uploadFilter = ref("all");
const uploadInputRef = ref(null);
const listLoading = ref(false);
const listError = ref("");
const documents = ref([]);
const deletingId = ref(null);
const replacingId = ref(null);
const replaceFiles = ref({});
const getExt = (name) => {
    const arr = name.toLowerCase().split(".");
    return arr.length > 1 ? arr[arr.length - 1] : "";
};
const isSupported = (file) => {
    return allowedExtensions.includes(getExt(file.name));
};
const filteredUploadItems = computed(() => {
    if (!uploadResult.value)
        return [];
    if (uploadFilter.value === "all")
        return uploadResult.value.items;
    if (uploadFilter.value === "success")
        return uploadResult.value.items.filter((x) => x.success);
    return uploadResult.value.items.filter((x) => !x.success);
});
const statusClass = (status) => {
    if (status === "ready")
        return "badge-ready";
    if (status === "processing" || status === "uploaded")
        return "badge-processing";
    return "badge-unknown";
};
const formatDate = (iso) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime()))
        return iso;
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
    }
    catch (err) {
        healthStatus.value = extractErrorMessage(err);
    }
    finally {
        healthLoading.value = false;
    }
};
const clearUploadSelection = () => {
    selectedFiles.value = [];
    if (uploadInputRef.value)
        uploadInputRef.value.value = "";
};
const onFilesChange = (event) => {
    uploadError.value = "";
    const input = event.target;
    const files = input.files ? Array.from(input.files) : [];
    const invalid = files.filter((f) => !isSupported(f));
    if (invalid.length > 0) {
        selectedFiles.value = [];
        uploadError.value = `仅支持 .pdf/.doc/.docx，以下文件不合法：${invalid.map((x) => x.name).join("，")}`;
        if (uploadInputRef.value)
            uploadInputRef.value.value = "";
        return;
    }
    selectedFiles.value = files;
};
const handleUpload = async () => {
    if (selectedFiles.value.length === 0)
        return;
    uploading.value = true;
    uploadError.value = "";
    try {
        uploadResult.value = await ingestDocuments(selectedFiles.value, overwrite.value);
        uploadFilter.value = "all";
        clearUploadSelection();
        await loadDocuments();
    }
    catch (err) {
        uploadError.value = extractErrorMessage(err);
    }
    finally {
        uploading.value = false;
    }
};
const loadDocuments = async () => {
    listLoading.value = true;
    listError.value = "";
    try {
        const list = await getDocuments();
        documents.value = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    catch (err) {
        listError.value = extractErrorMessage(err);
    }
    finally {
        listLoading.value = false;
    }
};
const onReplaceSelected = (event, documentId) => {
    listError.value = "";
    const input = event.target;
    const file = input.files?.[0];
    if (!file)
        return;
    if (!isSupported(file)) {
        replaceFiles.value[documentId] = undefined;
        listError.value = `替换文件仅支持 .pdf/.doc/.docx，当前文件：${file.name}`;
        input.value = "";
        return;
    }
    replaceFiles.value[documentId] = file;
};
const handleReplace = async (documentId) => {
    const file = replaceFiles.value[documentId];
    if (!file)
        return;
    replacingId.value = documentId;
    try {
        await updateDocument(documentId, file);
        replaceFiles.value[documentId] = undefined;
        await loadDocuments();
    }
    catch (err) {
        listError.value = extractErrorMessage(err);
    }
    finally {
        replacingId.value = null;
    }
};
const handleDelete = async (documentId) => {
    const ok = window.confirm(`确认删除文档 ID ${documentId} 吗？`);
    if (!ok)
        return;
    deletingId.value = documentId;
    try {
        await deleteDocument(documentId);
        await loadDocuments();
    }
    catch (err) {
        listError.value = extractErrorMessage(err);
    }
    finally {
        deletingId.value = null;
    }
};
onMounted(async () => {
    await checkHealth();
    await loadDocuments();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row" },
    ...{ style: {} },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ style: {} },
});
(__VLS_ctx.baseUrlInput);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.saveBaseUrl) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.checkHealth) },
    ...{ class: "secondary" },
    disabled: (__VLS_ctx.healthLoading),
});
(__VLS_ctx.healthLoading ? "检查中..." : "GET /api/health");
if (__VLS_ctx.healthStatus) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: (__VLS_ctx.healthStatus === 'ok' ? 'success' : 'error') },
    });
    (__VLS_ctx.healthStatus === "ok" ? "后端在线" : `异常: ${__VLS_ctx.healthStatus}`);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row" },
    ...{ style: {} },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onChange: (__VLS_ctx.onFilesChange) },
    ref: "uploadInputRef",
    type: "file",
    multiple: true,
    accept: ".pdf,.doc,.docx",
});
/** @type {typeof __VLS_ctx.uploadInputRef} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "checkbox",
});
(__VLS_ctx.overwrite);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.handleUpload) },
    disabled: (__VLS_ctx.uploading || __VLS_ctx.selectedFiles.length === 0),
});
(__VLS_ctx.uploading ? "上传处理中..." : `POST /api/rag/ingest (${__VLS_ctx.selectedFiles.length})`);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.clearUploadSelection) },
    ...{ class: "secondary" },
    disabled: (__VLS_ctx.uploading || __VLS_ctx.selectedFiles.length === 0),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "hint" },
});
if (__VLS_ctx.uploadError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "error" },
    });
    (__VLS_ctx.uploadError);
}
if (__VLS_ctx.uploadResult) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.uploadResult.total);
    (__VLS_ctx.uploadResult.succeeded);
    (__VLS_ctx.uploadResult.failed);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.uploadResult))
                    return;
                __VLS_ctx.uploadFilter = 'all';
            } },
        ...{ class: "secondary" },
        disabled: (__VLS_ctx.uploadFilter === 'all'),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.uploadResult))
                    return;
                __VLS_ctx.uploadFilter = 'success';
            } },
        ...{ class: "secondary" },
        disabled: (__VLS_ctx.uploadFilter === 'success'),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.uploadResult))
                    return;
                __VLS_ctx.uploadFilter = 'failed';
            } },
        ...{ class: "secondary" },
        disabled: (__VLS_ctx.uploadFilter === 'failed'),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.filteredUploadItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (item.file_name + String(item.document_id)),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (item.file_name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: (item.success ? 'success' : 'error') },
        });
        (item.success ? "成功" : "失败");
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (item.document_id ?? "-");
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (item.parent_chunks);
        (item.child_chunks);
        (item.images);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (item.already_exists ? "已存在" : "新文件");
        (item.overwritten ? "已覆盖" : "未覆盖");
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: "error" },
        });
        (item.error ?? "-");
    }
    if (__VLS_ctx.filteredUploadItems.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: "6",
        });
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadDocuments) },
    ...{ class: "secondary" },
    disabled: (__VLS_ctx.listLoading),
});
(__VLS_ctx.listLoading ? "刷新中..." : "刷新列表");
if (__VLS_ctx.listError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "error" },
    });
    (__VLS_ctx.listError);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
for (const [doc] of __VLS_getVForSourceType((__VLS_ctx.documents))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
        key: (doc.id),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    (doc.id);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    (doc.file_name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge" },
        ...{ class: (__VLS_ctx.statusClass(doc.status)) },
    });
    (doc.status);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    (__VLS_ctx.formatDate(doc.created_at));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onChange: ((e) => __VLS_ctx.onReplaceSelected(e, doc.id)) },
        type: "file",
        accept: ".pdf,.doc,.docx",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.handleReplace(doc.id);
            } },
        disabled: (!__VLS_ctx.replaceFiles[doc.id] || __VLS_ctx.replacingId === doc.id),
    });
    (__VLS_ctx.replacingId === doc.id ? "更新中..." : "PUT /api/rag/documents/{id}");
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.handleDelete(doc.id);
            } },
        ...{ class: "secondary" },
        disabled: (__VLS_ctx.deletingId === doc.id),
    });
    (__VLS_ctx.deletingId === doc.id ? "删除中..." : "DELETE /api/rag/documents/{id}");
}
if (__VLS_ctx.documents.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
        colspan: "6",
    });
}
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['error']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['error']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['error']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            baseUrlInput: baseUrlInput,
            healthStatus: healthStatus,
            healthLoading: healthLoading,
            selectedFiles: selectedFiles,
            overwrite: overwrite,
            uploading: uploading,
            uploadError: uploadError,
            uploadResult: uploadResult,
            uploadFilter: uploadFilter,
            uploadInputRef: uploadInputRef,
            listLoading: listLoading,
            listError: listError,
            documents: documents,
            deletingId: deletingId,
            replacingId: replacingId,
            replaceFiles: replaceFiles,
            filteredUploadItems: filteredUploadItems,
            statusClass: statusClass,
            formatDate: formatDate,
            saveBaseUrl: saveBaseUrl,
            checkHealth: checkHealth,
            clearUploadSelection: clearUploadSelection,
            onFilesChange: onFilesChange,
            handleUpload: handleUpload,
            loadDocuments: loadDocuments,
            onReplaceSelected: onReplaceSelected,
            handleReplace: handleReplace,
            handleDelete: handleDelete,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
