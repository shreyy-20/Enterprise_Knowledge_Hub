import apiClient from './client';
import type { Document, DocumentChunk, PaginatedResponse } from '../types';

export interface GetDocumentsParams {
  page?: number;
  size?: number;
  search?: string;
  file_type?: string;
  status?: string;
  project_id?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export const documentsApi = {
  getDocuments: async (params: GetDocumentsParams = {}): Promise<PaginatedResponse<Document>> => {
    const response = await apiClient.get<PaginatedResponse<Document>>('/documents', { params });
    return response.data;
  },

  getDocument: async (id: string): Promise<Document> => {
    const response = await apiClient.get<Document>(`/documents/${id}`);
    return response.data;
  },

  createDocument: async (formData: FormData): Promise<Document> => {
    const response = await apiClient.post<Document>('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateDocument: async (id: string, data: Partial<Document>): Promise<Document> => {
    const response = await apiClient.put<Document>(`/documents/${id}`, data);
    return response.data;
  },

  deleteDocument: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
  },

  getDocumentChunks: async (id: string): Promise<DocumentChunk[]> => {
    const response = await apiClient.get<DocumentChunk[]>(`/documents/${id}/chunks`);
    return response.data;
  },

  summarizeDocument: async (id: string): Promise<{ summary: string }> => {
    const response = await apiClient.post<{ summary: string }>(`/documents/${id}/summarize`);
    return response.data;
  },

  uploadDocument: async (
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Promise<Document> => {
    const response = await apiClient.post<Document>('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
    return response.data;
  },
};
