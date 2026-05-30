import api from '../lib/api';

export interface HoldingSnapshot {
  id: string;
  period: string;
  value: string;
  asOfDate: string;
  note: string | null;
}

export interface Holding {
  id: string;
  name: string;
  type: string;
  investedAmount: string | null;
  note: string | null;
  snapshots: HoldingSnapshot[];
}

export const holdingsApi = {
  getAll: () => api.get<Holding[]>('/api/holdings').then((r) => r.data),

  create: (data: { name: string; type: string; investedAmount?: number; note?: string }) =>
    api.post<Holding>('/api/holdings', data).then((r) => r.data),

  update: (id: string, data: Partial<{ name: string; type: string; investedAmount: number; note: string }>) =>
    api.patch<Holding>(`/api/holdings/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/api/holdings/${id}`),
};
