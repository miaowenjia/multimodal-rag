import { getApiBaseUrl, http } from "./http";
import type {
  AskRequest,
  AskResponse,
  AskSseMessage,
  BatchIngestResponse,
  ConfigAllResponse,
  ConfigUpdateResponse,
  DeleteDocumentResponse,
  DocumentListItem,
  HealthResponse,
  ModelConfigResponse,
  ModelConfigUpdateRequest,
  RerankerConfigResponse,
  RerankerConfigUpdateRequest,
  RetrievalConfigResponse,
  RetrievalConfigUpdateRequest,
  UpdateDocumentResponse
} from "../types/rag";

export const getHealth = async (): Promise<HealthResponse> => {
  const { data } = await http.get<HealthResponse>("/health");
  return data;
};

export const getDocuments = async (): Promise<DocumentListItem[]> => {
  const { data } = await http.get<DocumentListItem[]>("/rag/documents");
  return data;
};

export const ingestDocuments = async (
  files: File[],
  overwrite: boolean
): Promise<BatchIngestResponse> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });
  formData.append("overwrite", String(overwrite));

  const { data } = await http.post<BatchIngestResponse>("/rag/ingest", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return data;
};

export const updateDocument = async (
  documentId: number,
  file: File
): Promise<UpdateDocumentResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await http.put<UpdateDocumentResponse>(
    `/rag/documents/${documentId}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    }
  );
  return data;
};

export const deleteDocument = async (
  documentId: number
): Promise<DeleteDocumentResponse> => {
  const { data } = await http.delete<DeleteDocumentResponse>(
    `/rag/documents/${documentId}`
  );
  return data;
};

export const ask = async (payload: AskRequest): Promise<AskResponse> => {
  const { data } = await http.post<AskResponse>("/rag/ask", payload);
  return data;
};

export const getModelConfig = async (): Promise<ModelConfigResponse> => {
  const { data } = await http.get<ModelConfigResponse>("/rag/config/model");
  return data;
};

export const updateModelConfig = async (
  payload: ModelConfigUpdateRequest
): Promise<ConfigUpdateResponse> => {
  const { data } = await http.put<ConfigUpdateResponse>("/rag/config/model", payload);
  return data;
};

export const getRerankerConfig = async (): Promise<RerankerConfigResponse> => {
  const { data } = await http.get<RerankerConfigResponse>("/rag/config/reranker");
  return data;
};

export const updateRerankerConfig = async (
  payload: RerankerConfigUpdateRequest
): Promise<ConfigUpdateResponse> => {
  const { data } = await http.put<ConfigUpdateResponse>(
    "/rag/config/reranker",
    payload
  );
  return data;
};

export const getRetrievalConfig = async (): Promise<RetrievalConfigResponse> => {
  const { data } = await http.get<RetrievalConfigResponse>("/rag/config/retrieval");
  return data;
};

export const updateRetrievalConfig = async (
  payload: RetrievalConfigUpdateRequest
): Promise<ConfigUpdateResponse> => {
  const { data } = await http.put<ConfigUpdateResponse>(
    "/rag/config/retrieval",
    payload
  );
  return data;
};

export const getConfigAll = async (): Promise<ConfigAllResponse> => {
  const { data } = await http.get<ConfigAllResponse>("/rag/config/all");
  return data;
};

interface StreamAskOptions {
  onMessage: (msg: AskSseMessage) => void;
  signal?: AbortSignal;
}

export const streamAsk = async (
  question: string,
  options: StreamAskOptions
): Promise<void> => {
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
        const parsed = JSON.parse(rawJson) as AskSseMessage;
        options.onMessage(parsed);
      } catch {
        // Keep parsing robust if the backend occasionally emits non-JSON lines.
      }
    });
  }
};
