import { computed, nextTick, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ask, streamAsk } from "../api/rag";
import { extractErrorMessage } from "../utils/error";
import { useChatStore } from "../stores/chat";
const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();
const prompts = [
    "请总结当前知识库的核心主题",
    "请按要点列出文档中的关键结论",
    "请对比文档中不同方案的优缺点",
    "请给出可执行的下一步建议"
];
const question = ref("");
const streamMode = ref(true);
const loading = ref(false);
const error = ref("");
const historyRef = ref(null);
let streamController = null;
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
watch(() => route.fullPath, () => {
    ensureSessionFromRoute();
}, { immediate: true });
watch(() => turns.value.length, async () => {
    await nextTick();
    if (historyRef.value) {
        historyRef.value.scrollTop = historyRef.value.scrollHeight;
    }
});
const usePrompt = (p) => {
    question.value = p;
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
const downloadFile = (name, content, mime = "text/plain;charset=utf-8") => {
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
    const lines = [];
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
                lines.push(`- [${c.index}] ${c.source_file} | 页码: ${c.page_no ?? "-"} | 位置: ${c.chunk_location || c.location_label || "-"} | 方式: ${c.retrieval_method || "-"}`);
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
    downloadFile(`${session.title}.json`, JSON.stringify(session, null, 2), "application/json;charset=utf-8");
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
                    chatStore.updateTurn(sid, turn.id, { citations: msg.content });
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
    }
    catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
            chatStore.updateTurn(sid, turn.id, {
                status: "aborted",
                error: "本轮已手动停止"
            });
        }
        else {
            const msg = extractErrorMessage(err);
            chatStore.updateTurn(sid, turn.id, {
                status: "error",
                error: msg
            });
            error.value = msg;
        }
    }
    finally {
        loading.value = false;
        streamController = null;
    }
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "chat-stage card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chat-toolbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row" },
    ...{ style: {} },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "checkbox",
});
(__VLS_ctx.streamMode);
if (__VLS_ctx.loading && __VLS_ctx.streamMode) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.abortStreaming) },
        ...{ class: "secondary" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.clearSession) },
    ...{ class: "secondary" },
    disabled: (__VLS_ctx.loading || __VLS_ctx.turns.length === 0),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.exportMarkdown) },
    ...{ class: "secondary" },
    disabled: (__VLS_ctx.turns.length === 0),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.exportJson) },
    ...{ class: "secondary" },
    disabled: (__VLS_ctx.turns.length === 0),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chat-history" },
    ref: "historyRef",
});
/** @type {typeof __VLS_ctx.historyRef} */ ;
if (__VLS_ctx.turns.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "empty-chat" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "prompt-grid" },
    });
    for (const [p] of __VLS_getVForSourceType((__VLS_ctx.prompts))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.turns.length === 0))
                        return;
                    __VLS_ctx.usePrompt(p);
                } },
            ...{ class: "prompt-chip" },
            key: (p),
        });
        (p);
    }
}
for (const [turn] of __VLS_getVForSourceType((__VLS_ctx.turns))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (turn.id),
        ...{ class: "turn-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bubble-row user-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bubble user-bubble" },
    });
    (turn.question);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bubble-row assistant-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "bubble assistant-bubble" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    (turn.answer || (turn.status === 'streaming' ? '思考中...' : '暂无回答'));
    if (turn.error) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "error" },
            ...{ style: {} },
        });
        (turn.error);
    }
    if (turn.citations.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "citation-box" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [c] of __VLS_getVForSourceType((turn.citations))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
                key: (`${turn.id}-${c.index}-${c.chunk_id}-${c.image_id}`),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.index);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.source_file);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.page_no ?? '-');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.chunk_location || c.location_label || '-');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            (c.retrieval_method || '-');
        }
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chat-input-wrap" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.textarea)({
    ...{ onKeydown: (__VLS_ctx.handleAsk) },
    value: (__VLS_ctx.question),
    placeholder: "输入问题后发送",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row" },
    ...{ style: {} },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "hint" },
});
(__VLS_ctx.currentSession?.title || '新建会话');
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.handleAsk) },
    disabled: (__VLS_ctx.loading || !__VLS_ctx.question.trim()),
});
(__VLS_ctx.loading ? "回答生成中..." : "发送");
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "error" },
    });
    (__VLS_ctx.error);
}
/** @type {__VLS_StyleScopedClasses['chat-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-history']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-chat']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['prompt-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['turn-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['bubble-row']} */ ;
/** @type {__VLS_StyleScopedClasses['user-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['user-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['bubble-row']} */ ;
/** @type {__VLS_StyleScopedClasses['assistant-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['assistant-bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['error']} */ ;
/** @type {__VLS_StyleScopedClasses['citation-box']} */ ;
/** @type {__VLS_StyleScopedClasses['chat-input-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['error']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            prompts: prompts,
            question: question,
            streamMode: streamMode,
            loading: loading,
            error: error,
            historyRef: historyRef,
            currentSession: currentSession,
            turns: turns,
            usePrompt: usePrompt,
            clearSession: clearSession,
            abortStreaming: abortStreaming,
            exportMarkdown: exportMarkdown,
            exportJson: exportJson,
            handleAsk: handleAsk,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
