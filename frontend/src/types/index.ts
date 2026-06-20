export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  department_id: string | null;
  is_active: boolean;
  roles: string[];
  created_at: string;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  file_type: string;
  file_url: string | null;
  file_size: number;
  owner_id: string;
  owner_name: string;
  project_id: string | null;
  status: 'draft' | 'published' | 'archived' | 'processing';
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  token_count: number;
}

export interface SearchResult {
  document_id: string;
  title: string;
  snippet: string;
  score: number;
  highlights: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  took_ms: number;
}

export interface SearchRequest {
  query: string;
  search_type?: 'semantic' | 'hybrid' | 'keyword';
  file_types?: string[];
  date_from?: string;
  date_to?: string;
  project_id?: string;
  department_id?: string;
  page?: number;
  size?: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'archived';
  department_id: string | null;
  members: string[];
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  created_at: string;
}

export interface DashboardData {
  search_usage: TimeSeriesData[];
  knowledge_growth: TimeSeriesData[];
  user_activity: TimeSeriesData[];
  top_experts: TopItem[];
  top_documents: TopItem[];
  total_documents: number;
  total_users: number;
  searches_today: number;
  active_projects: number;
}

export interface TimeSeriesData {
  date: string;
  value: number;
}

export interface TopItem {
  id: string;
  name: string;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  department_id?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}

export interface SystemStats {
  total_documents: number;
  total_users: number;
  total_chunks: number;
  total_searches: number;
  storage_used_bytes: number;
  index_health: 'healthy' | 'degraded' | 'unhealthy';
  uptime_seconds: number;
  avg_search_latency_ms: number;
}

export interface RAGResponse {
  answer: string;
  sources: Array<{
    document_id: string;
    title: string;
    snippet: string;
    score: number;
  }>;
}
