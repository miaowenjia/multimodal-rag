import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useChatStore } from "./stores/chat";
const router = useRouter();
const route = useRoute();
const chatStore = useChatStore();
const searchText = ref("");
const openMenuId = ref(null);
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
watch(() => route.fullPath, () => {
    normalizeSessionFromRoute();
    closeMenu();
}, { immediate: true });
const toggleMenu = (sessionId) => {
    openMenuId.value = openMenuId.value === sessionId ? null : sessionId;
};
const openSession = (sessionId) => {
    chatStore.setCurrentSession(sessionId);
    router.push({ name: "chat", params: { sessionId } });
};
const createNewChat = () => {
    const created = chatStore.createSession();
    router.push({ name: "chat", params: { sessionId: created.id } });
};
const renameSession = (sessionId) => {
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
const removeSession = (sessionId) => {
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
const isCurrentSession = (id) => chatStore.currentSessionId === id;
const formatTime = (iso) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    return date.toLocaleDateString();
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "app-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "app-sidebar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar-top-fixed" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.goImportDocs) },
    ...{ class: "side-btn" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.createNewChat) },
    ...{ class: "side-btn side-btn-primary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "sidebar-middle" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "session-head" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "hint" },
});
(__VLS_ctx.filteredSessions.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ class: "session-search" },
    placeholder: "搜索会话标题",
    'aria-label': "搜索会话",
});
(__VLS_ctx.searchText);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "session-list-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "session-list" },
});
for (const [session] of __VLS_getVForSourceType((__VLS_ctx.filteredSessions))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (session.id),
        ...{ class: "session-item" },
        ...{ class: ({ active: __VLS_ctx.isCurrentSession(session.id) }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "session-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.openSession(session.id);
            } },
        ...{ class: "session-main-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "session-title" },
    });
    (session.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "session-time" },
    });
    (__VLS_ctx.formatTime(session.updatedAt));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "session-menu-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.toggleMenu(session.id);
            } },
        ...{ class: "session-ellipsis" },
    });
    if (__VLS_ctx.openMenuId === session.id) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: () => { } },
            ...{ class: "session-menu" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.openMenuId === session.id))
                        return;
                    __VLS_ctx.renameSession(session.id);
                } },
            ...{ class: "session-menu-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.openMenuId === session.id))
                        return;
                    __VLS_ctx.removeSession(session.id);
                } },
            ...{ class: "session-menu-item danger" },
        });
    }
}
if (__VLS_ctx.filteredSessions.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "hint" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar-bottom-fixed" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.goSettings) },
    ...{ class: "side-btn side-btn-ghost" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "app-main" },
});
const __VLS_0 = {}.RouterView;
/** @type {[typeof __VLS_components.RouterView, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
/** @type {__VLS_StyleScopedClasses['app-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['app-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-top-fixed']} */ ;
/** @type {__VLS_StyleScopedClasses['side-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['side-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['side-btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['session-head']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['session-search']} */ ;
/** @type {__VLS_StyleScopedClasses['session-list-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['session-list']} */ ;
/** @type {__VLS_StyleScopedClasses['session-item']} */ ;
/** @type {__VLS_StyleScopedClasses['session-row']} */ ;
/** @type {__VLS_StyleScopedClasses['session-main-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['session-title']} */ ;
/** @type {__VLS_StyleScopedClasses['session-time']} */ ;
/** @type {__VLS_StyleScopedClasses['session-menu-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['session-ellipsis']} */ ;
/** @type {__VLS_StyleScopedClasses['session-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['session-menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['session-menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-bottom-fixed']} */ ;
/** @type {__VLS_StyleScopedClasses['side-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['side-btn-ghost']} */ ;
/** @type {__VLS_StyleScopedClasses['app-main']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            searchText: searchText,
            openMenuId: openMenuId,
            filteredSessions: filteredSessions,
            toggleMenu: toggleMenu,
            openSession: openSession,
            createNewChat: createNewChat,
            renameSession: renameSession,
            removeSession: removeSession,
            goImportDocs: goImportDocs,
            goSettings: goSettings,
            isCurrentSession: isCurrentSession,
            formatTime: formatTime,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
