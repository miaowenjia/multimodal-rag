export interface AskRequest {
  question: string;
  stream: boolean;
}

export interface CitationItem {
  index: number;
  source_file: string;
  page_no?: number | null;
  chunk_id?: string | null;
  image_id?: string | null;
  chunk_location?: string | null;
  location_label?: string | null;
  preview?: string | null;
  index_type?: string | null;
  content_type?: string | null;
  retrieval_method?: string | null;
  score?: number | null;
  rerank_score?: number | null;
}

export interface AnswerImageItem {
  image_id: string;
  source_file: string;
  page_no?: number | null;
  chunk_location?: string | null;
  location_label: string;
  caption?: string | null;
  content_type: string;
  image_url: string;
}

export interface AskResponse {
  answer: string;
  citations: CitationItem[];
  images: AnswerImageItem[];
  rerank_status: Record<string, unknown>;
}

export interface AskSseMessage {
  type: "token" | "citations" | "images" | "done";
  content?: string | CitationItem[] | AnswerImageItem[];
}

export interface BatchIngestResponse {
  total: number;
  succeeded: number;
  failed: number;
  items: IngestItem[];
}

export interface IngestItem {
  file_name: string;
  success: boolean;
  document_id?: number | null;
  parent_chunks: number;
  child_chunks: number;
  images: number;
  already_exists: boolean;
  overwritten: boolean;
  error?: string | null;
}

export interface DocumentListItem {
  id: number;
  file_name: string;
  status: string;
  created_at: string;
}

export interface DeleteDocumentResponse {
  document_id: number;
  status: string;
}

export interface UpdateDocumentResponse {
  old_document_id: number;
  new_document_id: number;
  file_name: string;
  parent_chunks: number;
  child_chunks: number;
  images: number;
}

export interface HealthResponse {
  status: string;
}

export interface LlmConfig {
  api_base: string;
  api_key: string;
  model_name: string;
  timeout: number;
}

export interface EmbeddingConfig {
  api_base: string;
  api_key: string;
  model_name: string;
}

export interface VisionConfig {
  enabled: boolean;
  api_base: string;
  api_key: string;
  model_name: string;
}

export interface ModelConfigResponse {
  llm: LlmConfig;
  embedding: EmbeddingConfig;
  vision: VisionConfig;
  source: string;
}

export interface ModelConfigUpdateRequest {
  llm: LlmConfig;
  embedding: EmbeddingConfig;
  vision: VisionConfig;
  apply_mode: string;
}

export interface RerankerConfig {
  api_base: string;
  api_key: string;
  model_name: string;
  timeout: number;
}

export interface RerankerConfigResponse {
  enabled: boolean;
  config: RerankerConfig;
  health_status: string;
}

export interface RerankerConfigUpdateRequest {
  enabled: boolean;
  config: RerankerConfig;
  apply_mode: string;
}

export interface RetrievalConfigResponse {
  top_k: number;
  keyword_top_k: number;
  final_top_n: number;
  description: Record<string, string>;
}

export interface RetrievalConfigUpdateRequest {
  top_k: number;
  keyword_top_k: number;
  final_top_n: number;
  apply_mode: string;
}

export interface ConfigUpdateResponse {
  message: string;
  applied: boolean;
  need_restart: boolean;
  current?: Record<string, unknown> | null;
}

export interface ConfigAllResponse {
  model: ModelConfigResponse;
  reranker: RerankerConfigResponse;
  retrieval: RetrievalConfigResponse;
}
