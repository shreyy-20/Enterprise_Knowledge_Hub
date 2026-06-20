import apiClient from './client';
import type { SearchRequest, SearchResponse, RAGResponse } from '../types';

export const searchApi = {
  search: async (request: SearchRequest): Promise<SearchResponse> => {
    const response = await apiClient.post<SearchResponse>('/search', request);
    return response.data;
  },

  getSuggestions: async (query: string): Promise<string[]> => {
    const response = await apiClient.get<string[]>('/search/suggestions', {
      params: { query },
    });
    return response.data;
  },

  askQuestion: async (query: string, searchType?: string): Promise<RAGResponse> => {
    const response = await apiClient.post<RAGResponse>('/search/ask', {
      query,
      search_type: searchType || 'hybrid',
    });
    return response.data;
  },
};
