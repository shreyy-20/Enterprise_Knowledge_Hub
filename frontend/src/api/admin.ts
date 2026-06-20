import apiClient from './client';
import type { User, AuditLog, SystemStats, PaginatedResponse } from '../types';

export interface GetUsersParams {
  page?: number;
  size?: number;
  search?: string;
  role?: string;
  is_active?: boolean;
}

export interface GetAuditLogsParams {
  page?: number;
  size?: number;
  user_id?: string;
  action?: string;
  resource_type?: string;
  date_from?: string;
  date_to?: string;
}

export const adminApi = {
  getUsers: async (params: GetUsersParams = {}): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get<PaginatedResponse<User>>('/admin/users', { params });
    return response.data;
  },

  updateUserRoles: async (userId: string, roles: string[]): Promise<User> => {
    const response = await apiClient.put<User>(`/admin/users/${userId}/roles`, { roles });
    return response.data;
  },

  updateUserStatus: async (userId: string, isActive: boolean): Promise<User> => {
    const response = await apiClient.put<User>(`/admin/users/${userId}/status`, {
      is_active: isActive,
    });
    return response.data;
  },

  getAuditLogs: async (params: GetAuditLogsParams = {}): Promise<PaginatedResponse<AuditLog>> => {
    const response = await apiClient.get<PaginatedResponse<AuditLog>>('/admin/audit-logs', {
      params,
    });
    return response.data;
  },

  getSystemStats: async (): Promise<SystemStats> => {
    const response = await apiClient.get<SystemStats>('/admin/system/stats');
    return response.data;
  },

  reindexDocuments: async (): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/admin/system/reindex');
    return response.data;
  },
};
