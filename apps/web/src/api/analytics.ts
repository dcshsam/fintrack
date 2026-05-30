import api from '../lib/api';

export interface MonthlyAnalytics {
  period: string;
  income: number;
  expense: number;
  savings: number;
  savingsRate: number;
  spendByCategory: Array<{ name: string; color: string; amount: number }>;
  dailySpend: Array<{ date: string; amount: number }>;
  portfolioValue: number;
}

export interface YearlyAnalytics {
  year: string;
  monthly: Array<{
    period: string;
    income: number;
    expense: number;
    savings: number;
    netWorth: number;
  }>;
  totals: { income: number; expense: number; savings: number };
  savingsRate: number;
  networthGrowth: number;
  topCategories: Array<{ name: string; color: string; amount: number }>;
}

export const analyticsApi = {
  getMonthly: (period: string) =>
    api.get<MonthlyAnalytics>('/api/analytics/monthly', { params: { period } }).then((r) => r.data),

  getYearly: (year: string) =>
    api.get<YearlyAnalytics>('/api/analytics/yearly', { params: { year } }).then((r) => r.data),
};
