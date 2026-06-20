import apiClient from './client';
import type { DashboardData, TimeSeriesData, TopItem } from '../types';

export const analyticsApi = {
  getDashboard: async (): Promise<DashboardData> => {
    const response = await apiClient.get<DashboardData>('/analytics/dashboard');
    return response.data;
  },

  getSearchUsage: async (range: string = '30d'): Promise<TimeSeriesData[]> => {
    const response = await apiClient.get<TimeSeriesData[]>('/analytics/search-usage', {
      params: { range },
    });
    return response.data;
  },

  getKnowledgeGrowth: async (range: string = '30d'): Promise<TimeSeriesData[]> => {
    const response = await apiClient.get<TimeSeriesData[]>('/analytics/knowledge-growth', {
      params: { range },
    });
    return response.data;
  },

  getUserActivity: async (range: string = '30d'): Promise<TimeSeriesData[]> => {
    const response = await apiClient.get<TimeSeriesData[]>('/analytics/user-activity', {
      params: { range },
    });
    return response.data;
  },

  getTopDocuments: async (limit: number = 10): Promise<TopItem[]> => {
    const response = await apiClient.get<TopItem[]>('/analytics/top-documents', {
      params: { limit },
    });
    return response.data;
  },

  getTopExperts: async (limit: number = 10): Promise<TopItem[]> => {
    const response = await apiClient.get<TopItem[]>('/analytics/top-experts', {
      params: { limit },
    });
    return response.data;
  },
};
