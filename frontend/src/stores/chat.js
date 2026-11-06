import { computed, ref, watch } from "vue";
import { defineStore } from "pinia";
const STORAGE_KEY = "rag_vue_chat_sessions_v1";
const defaultSessionTitle = "新建会话";
const nowIso = () => new Date().toISOString();
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const loadPersistState = () => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return { sessions: [], currentSessionId: null };
    }
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.sessions)) {
            return { sessions: [], currentSessionId: null };
        }
        return {
            sessions: parsed.sessions,
            currentSessionId: parsed.currentSessionId ?? null
        };
    }
    catch {
        return { sessions: [], currentSessionId: null };
    }
};
export const useChatStore = defineStore("chat", () => {
    const initial = loadPersistState();
    const sessions = ref(initial.sessions);
    const currentSessionId = ref(initial.currentSessionId);
    const sortedSessions = computed(() => {
        return [...sessions.value].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    });
    const currentSession = computed(() => {
        if (!currentSessionId.value) {
            return null;
        }
        return sessions.value.find((s) => s.id === currentSessionId.value) ?? null;
    });
    const getSessionById = (sessionId) => {
        return sessions.value.find((s) => s.id === sessionId) ?? null;
    };
    const createSession = (title = defaultSessionTitle) => {
        const session = {
            id: uid(),
            title,
            createdAt: nowIso(),
            updatedAt: nowIso(),
            turns: []
        };
        sessions.value.unshift(session);
        currentSessionId.value = session.id;
        return session;
    };
    const ensureSession = () => {
        if (currentSession.value) {
            return currentSession.value;
        }
        return createSession();
    };
    const setCurrentSession = (sessionId) => {
        if (sessions.value.some((s) => s.id === sessionId)) {
            currentSessionId.value = sessionId;
        }
    };
    const renameSession = (sessionId, title) => {
        const session = getSessionById(sessionId);
        if (!session) {
            return false;
        }
        const trimmed = title.trim();
        if (!trimmed) {
            return false;
        }
        session.title = trimmed;
        session.updatedAt = nowIso();
        return true;
    };
    const deleteSession = (sessionId) => {
        const index = sessions.value.findIndex((s) => s.id === sessionId);
        if (index < 0) {
            return ensureSession().id;
        }
        const wasCurrent = currentSessionId.value === sessionId;
        sessions.value.splice(index, 1);
        if (sessions.value.length === 0) {
            return createSession().id;
        }
        if (wasCurrent) {
            const next = sortedSessions.value[0];
            currentSessionId.value = next.id;
            return next.id;
        }
        return currentSessionId.value ?? ensureSession().id;
    };
    const appendTurn = (sessionId, question) => {
        const session = getSessionById(sessionId);
        if (!session) {
            return null;
        }
        const turn = {
            id: uid(),
            question,
            answer: "",
            citations: [],
            status: "streaming",
            error: null
        };
        session.turns.push(turn);
        session.updatedAt = nowIso();
        if (session.title === defaultSessionTitle) {
            session.title = question.slice(0, 24) || defaultSessionTitle;
        }
        return turn;
    };
    const updateTurn = (sessionId, turnId, patch) => {
        const session = getSessionById(sessionId);
        if (!session) {
            return;
        }
        const turn = session.turns.find((t) => t.id === turnId);
        if (!turn) {
            return;
        }
        Object.assign(turn, patch);
        session.updatedAt = nowIso();
    };
    const clearSessionTurns = (sessionId) => {
        const session = getSessionById(sessionId);
        if (!session) {
            return;
        }
        session.turns = [];
        session.title = defaultSessionTitle;
        session.updatedAt = nowIso();
    };
    watch([sessions, currentSessionId], () => {
        const payload = {
            sessions: sessions.value,
            currentSessionId: currentSessionId.value
        };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }, { deep: true });
    if (!currentSession.value) {
        createSession();
    }
    return {
        sessions,
        sortedSessions,
        currentSessionId,
        currentSession,
        createSession,
        ensureSession,
        setCurrentSession,
        renameSession,
        deleteSession,
        getSessionById,
        appendTurn,
        updateTurn,
        clearSessionTurns
    };
});
