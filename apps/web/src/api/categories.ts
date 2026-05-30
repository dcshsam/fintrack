import api from '../lib/api';

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  userId: string;
}

export const categoriesApi = {
  getAll: () => api.get<Category[]>('/api/categories').then((r) => r.data),

  create: (data: { name: string; type: string; color?: string }) =>
    api.post<Category>('/api/categories', data).then((r) => r.data),

  update: (id: string, data: { name?: string; type?: string; color?: string }) =>
    api.patch<Category>(`/api/categories/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/api/categories/${id}`),
};
