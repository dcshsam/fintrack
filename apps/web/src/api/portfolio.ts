import api from '../lib/api';

export interface SnapshotWithHolding {
  id: string;
  period: string;
  value: string;
  note: string | null;
  holding: {
    id: string;
    name: string;
    type: string;
    investedAmount: string | null;
  };
}

export interface NetWorthPoint {
  period: string;
  netWorth: number;
}

export const portfolioApi = {
  getForPeriod: (period: string) =>
    api.get<SnapshotWithHolding[]>(`/api/portfolio/${period}`).then((r) => r.data),

  bulkUpsert: (
    period: string,
    snapshots: Array<{ holdingId: string; value: number; note?: string }>,
  ) => api.put(`/api/portfolio/${period}`, { snapshots }).then((r) => r.data),

  getNetworth: (from: string, to: string) =>
    api.get<NetWorthPoint[]>('/api/portfolio/networth', { params: { from, to } }).then((r) => r.data),
};
