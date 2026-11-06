import { onMounted, reactive, ref } from "vue";
import { getConfigAll, getModelConfig, getRerankerConfig, getRetrievalConfig, updateModelConfig, updateRerankerConfig, updateRetrievalConfig } from "../api/rag";
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
    base_url: "http://127.0.0.1:9998",
    timeout: 60
});
const retrievalForm = reactive({
    top_k: 15,
    keyword_top_k: 15,
    final_top_n: 8
});
const isUnimplementedError = (msg) => {
    const lower = msg.toLowerCase();
    return lower.includes("404") || lower.includes("405") || lower.includes("not found") || lower.includes("未找到") || lower.includes("not implemented");
};
const setGlobal = (msg, isError) => {
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
        Object.assign(rerankerForm, all.reranker);
        Object.assign(retrievalForm, all.retrieval);
        setGlobal("配置总览读取成功。", false);
    }
    catch (err) {
        const msg = extractErrorMessage(err);
        if (isUnimplementedError(msg)) {
            setGlobal("/api/rag/config/all 当前后端尚未实现。前端已就绪，后端补路由后可直接联调。", true);
        }
        else {
            setGlobal(msg, true);
        }
    }
    finally {
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
    }
    catch (err) {
        const msg = extractErrorMessage(err);
        modelError.value = true;
        modelMessage.value = isUnimplementedError(msg)
            ? "/api/rag/config/model 当前后端尚未实现。"
            : msg;
    }
    finally {
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
    }
    catch (err) {
        const msg = extractErrorMessage(err);
        modelError.value = true;
        modelMessage.value = isUnimplementedError(msg)
            ? "/api/rag/config/model 当前后端尚未实现（保存未生效）。"
            : msg;
    }
    finally {
        savingModel.value = false;
    }
};
const loadRerankerConfig = async () => {
    loadingReranker.value = true;
    rerankerMessage.value = "";
    try {
        const cfg = await getRerankerConfig();
        Object.assign(rerankerForm, cfg);
        rerankerError.value = false;
        rerankerMessage.value = "Reranker 配置读取成功。";
    }
    catch (err) {
        const msg = extractErrorMessage(err);
        rerankerError.value = true;
        rerankerMessage.value = isUnimplementedError(msg)
            ? "/api/rag/config/reranker 当前后端尚未实现。"
            : msg;
    }
    finally {
        loadingReranker.value = false;
    }
};
const saveRerankerConfig = async () => {
    savingReranker.value = true;
    rerankerMessage.value = "";
    try {
        const result = await updateRerankerConfig({
            ...rerankerForm,
            apply_mode: "persist_and_reload"
        });
        rerankerError.value = false;
        rerankerMessage.value = result.message || "Reranker 配置已提交。";
    }
    catch (err) {
        const msg = extractErrorMessage(err);
        rerankerError.value = true;
        rerankerMessage.value = isUnimplementedError(msg)
            ? "/api/rag/config/reranker 当前后端尚未实现（保存未生效）。"
            : msg;
    }
    finally {
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
    }
    catch (err) {
        const msg = extractErrorMessage(err);
        retrievalError.value = true;
        retrievalMessage.value = isUnimplementedError(msg)
            ? "/api/rag/config/retrieval 当前后端尚未实现。"
            : msg;
    }
    finally {
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
    }
    catch (err) {
        const msg = extractErrorMessage(err);
        retrievalError.value = true;
        retrievalMessage.value = isUnimplementedError(msg)
            ? "/api/rag/config/retrieval 当前后端尚未实现（保存未生效）。"
            : msg;
    }
    finally {
        savingRetrieval.value = false;
    }
};
onMounted(() => {
    loadAll();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadAll) },
    ...{ class: "secondary" },
    disabled: (__VLS_ctx.loadingAll),
});
(__VLS_ctx.loadingAll ? "读取中..." : "读取配置总览");
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "hint" },
});
if (__VLS_ctx.globalMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: (__VLS_ctx.globalIsError ? 'error' : 'success') },
    });
    (__VLS_ctx.globalMessage);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadModelConfig) },
    ...{ class: "secondary" },
    disabled: (__VLS_ctx.loadingModel),
});
(__VLS_ctx.loadingModel ? "读取中..." : "读取");
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.saveModelConfig) },
    disabled: (__VLS_ctx.savingModel),
});
(__VLS_ctx.savingModel ? "保存中..." : "保存");
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({});
(__VLS_ctx.modelForm.llm.api_base);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "password",
});
(__VLS_ctx.modelForm.llm.api_key);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({});
(__VLS_ctx.modelForm.llm.model_name);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "number",
    min: "1",
});
(__VLS_ctx.modelForm.llm.timeout);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({});
(__VLS_ctx.modelForm.embedding.api_base);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "password",
});
(__VLS_ctx.modelForm.embedding.api_key);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({});
(__VLS_ctx.modelForm.embedding.model_name);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "checkbox",
});
(__VLS_ctx.modelForm.vision.enabled);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({});
(__VLS_ctx.modelForm.vision.api_base);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "password",
});
(__VLS_ctx.modelForm.vision.api_key);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({});
(__VLS_ctx.modelForm.vision.model_name);
if (__VLS_ctx.modelMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: (__VLS_ctx.modelError ? 'error' : 'success') },
    });
    (__VLS_ctx.modelMessage);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadRerankerConfig) },
    ...{ class: "secondary" },
    disabled: (__VLS_ctx.loadingReranker),
});
(__VLS_ctx.loadingReranker ? "读取中..." : "读取");
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.saveRerankerConfig) },
    disabled: (__VLS_ctx.savingReranker),
});
(__VLS_ctx.savingReranker ? "保存中..." : "保存");
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "checkbox",
});
(__VLS_ctx.rerankerForm.enabled);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({});
(__VLS_ctx.rerankerForm.base_url);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "number",
    min: "1",
});
(__VLS_ctx.rerankerForm.timeout);
if (__VLS_ctx.rerankerMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: (__VLS_ctx.rerankerError ? 'error' : 'success') },
    });
    (__VLS_ctx.rerankerMessage);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "panel-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadRetrievalConfig) },
    ...{ class: "secondary" },
    disabled: (__VLS_ctx.loadingRetrieval),
});
(__VLS_ctx.loadingRetrieval ? "读取中..." : "读取");
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.saveRetrievalConfig) },
    disabled: (__VLS_ctx.savingRetrieval),
});
(__VLS_ctx.savingRetrieval ? "保存中..." : "保存");
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "number",
    min: "1",
    max: "100",
});
(__VLS_ctx.retrievalForm.top_k);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "number",
    min: "1",
    max: "100",
});
(__VLS_ctx.retrievalForm.keyword_top_k);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "number",
    min: "1",
});
(__VLS_ctx.retrievalForm.final_top_n);
if (__VLS_ctx.retrievalHint) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "hint" },
    });
    (__VLS_ctx.retrievalHint);
}
if (__VLS_ctx.retrievalMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: (__VLS_ctx.retrievalError ? 'error' : 'success') },
    });
    (__VLS_ctx.retrievalMessage);
}
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-head']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loadingAll: loadingAll,
            loadingModel: loadingModel,
            loadingReranker: loadingReranker,
            loadingRetrieval: loadingRetrieval,
            savingModel: savingModel,
            savingReranker: savingReranker,
            savingRetrieval: savingRetrieval,
            globalMessage: globalMessage,
            globalIsError: globalIsError,
            modelMessage: modelMessage,
            modelError: modelError,
            rerankerMessage: rerankerMessage,
            rerankerError: rerankerError,
            retrievalMessage: retrievalMessage,
            retrievalError: retrievalError,
            retrievalHint: retrievalHint,
            modelForm: modelForm,
            rerankerForm: rerankerForm,
            retrievalForm: retrievalForm,
            loadAll: loadAll,
            loadModelConfig: loadModelConfig,
            saveModelConfig: saveModelConfig,
            loadRerankerConfig: loadRerankerConfig,
            saveRerankerConfig: saveRerankerConfig,
            loadRetrievalConfig: loadRetrievalConfig,
            saveRetrievalConfig: saveRetrievalConfig,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
