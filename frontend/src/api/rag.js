import { getApiBaseUrl, http } from "./http";
export const getHealth = async () => {
    const { data } = await http.get("/health");
    return data;
};
export const getDocuments = async () => {
    const { data } = await http.get("/rag/documents");
    return data;
};
export const ingestDocuments = async (files, overwrite) => {
    const formData = new FormData();
    files.forEach((file) => {
        formData.append("files", file);
    });
    formData.append("overwrite", String(overwrite));
    const { data } = await http.post("/rag/ingest", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });
    return data;
};
export const updateDocument = async (documentId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await http.put(`/rag/documents/${documentId}`, formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    });
    return data;
};
export const deleteDocument = async (documentId) => {
    const { data } = await http.delete(`/rag/documents/${documentId}`);
    return data;
};
export const ask = async (payload) => {
    const { data } = await http.post("/rag/ask", payload);
    return data;
};
export const getModelConfig = async () => {
    const { data } = await http.get("/rag/config/model");
    return data;
};
export const updateModelConfig = async (payload) => {
    const { data } = await http.put("/rag/config/model", payload);
    return data;
};
export const getRerankerConfig = async () => {
    const { data } = await http.get("/rag/config/reranker");
    return data;
};
export const updateRerankerConfig = async (payload) => {
    const { data } = await http.put("/rag/config/reranker", payload);
    return data;
};
export const getRetrievalConfig = async () => {
    const { data } = await http.get("/rag/config/retrieval");
    return data;
};
export const updateRetrievalConfig = async (payload) => {
    const { data } = await http.put("/rag/config/retrieval", payload);
    return data;
};
export const getConfigAll = async () => {
    const { data } = await http.get("/rag/config/all");
    return data;
};
export const streamAsk = async (question, options) => {
    const response = await fetch(`${getApiBaseUrl()}/api/rag/ask`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ question, stream: true }),
        signal: options.signal
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `流式请求失败: ${response.status}`);
    }
    if (!response.body) {
        throw new Error("未获取到流式响应体");
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        chunks.forEach((rawEvent) => {
            const lines = rawEvent.split("\n");
            const dataLine = lines.find((line) => line.startsWith("data:"));
            if (!dataLine) {
                return;
            }
            const rawJson = dataLine.slice(5).trim();
            if (!rawJson) {
                return;
            }
            try {
                const parsed = JSON.parse(rawJson);
                options.onMessage(parsed);
            }
            catch {
                // Keep parsing robust if the backend occasionally emits non-JSON lines.
            }
        });
    }
};
