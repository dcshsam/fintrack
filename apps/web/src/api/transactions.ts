import api from '../lib/api';
import { Category } from './categories';

export interface PaymentMethod {
  id: string;
  name: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: string;
  txnDate: string;
  note: string | null;
  categoryId: string;
  paymentMethodId: string | null;
  category: Pick<Category, 'id' | 'name' | 'color' | 'type'>;
  paymentMethod: PaymentMethod | null;
  createdAt: string;
}

export interface TransactionPage {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface TransactionFilters {
  from?: string;
  to?: string;
  type?: string;
  categoryId?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export const transactionsApi = {
  getAll: (filters: TransactionFilters = {}) =>
    api.get<TransactionPage>('/api/transactions', { params: filters }).then((r) => r.data),

  create: (data: {
    categoryId: string;
    paymentMethodId?: string;
    type: string;
    amount: number;
    txnDate: string;
    note?: string;
  }) => api.post<Transaction>('/api/transactions', data).then((r) => r.data),

  update: (id: string, data: Partial<{
    categoryId: string;
    paymentMethodId: string;
    type: string;
    amount: number;
    txnDate: string;
    note: string;
  }>) => api.patch<Transaction>(`/api/transactions/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/api/transactions/${id}`),

  getPaymentMethods: () =>
    api.get<PaymentMethod[]>('/api/payment-methods').then((r) => r.data),
};
