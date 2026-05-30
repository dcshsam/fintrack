import { useQuery } from '@tanstack/react-query';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import api from '../lib/api';
import { formatINR, formatPct, formatDate } from '../lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface DashboardSummary {
  netWorth: {
    current: number;
    previous: number;
    change: number;
    changePct: number;
    period: string;
  };
  assetAllocation: Array<{ type: string; value: number; percentage: number }>;
  holdings: Array<{
    id: string;
    name: string;
    type: string;
    currentValue: number;
    investedAmount: string | null;
    gainLoss: number | null;
    gainLossPct: number | null;
  }>;
  monthly: { income: number; expense: number; savings: number; period: string };
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: string;
    txnDate: string;
    note: string | null;
    category: { name: string; color: string };
  }>;
}

const ASSET_COLORS: Record<string, string> = {
  Equity: '#6366f1',
  MutualFund: '#8b5cf6',
  PF: '#22c55e',
  FD: '#f59e0b',
  Gold: '#f97316',
  Crypto: '#06b6d4',
  Cash: '#10b981',
  RealEstate: '#ef4444',
  Other: '#6b7280',
};

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardSummary>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/api/dashboard/summary').then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  if (!data) return null;

  const { netWorth, assetAllocation, holdings, monthly, recentTransactions } = data;

  const networthTrend = netWorth.change > 0 ? 'up' : netWorth.change < 0 ? 'down' : 'flat';

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Your financial overview</p>
      </div>

      {/* Net Worth */}
      <Card className="bg-gradient-to-br from-indigo-600/20 to-purple-600/10 border-indigo-500/30">
        <CardContent className="p-8">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400 mb-2">Total Net Worth</p>
              <p className="text-4xl font-bold text-white">{formatINR(netWorth.current)}</p>
              <div className="flex items-center gap-2 mt-3">
                {networthTrend === 'up' && (
                  <span className="flex items-center gap-1 text-green-400 text-sm font-medium">
                    <ArrowUpRight className="h-4 w-4" />
                    {formatINR(netWorth.change)} ({formatPct(netWorth.changePct)})
                  </span>
                )}
                {networthTrend === 'down' && (
                  <span className="flex items-center gap-1 text-red-400 text-sm font-medium">
                    <ArrowDownRight className="h-4 w-4" />
                    {formatINR(netWorth.change)} ({formatPct(netWorth.changePct)})
                  </span>
                )}
                {networthTrend === 'flat' && (
                  <span className="flex items-center gap-1 text-gray-400 text-sm">
                    <Minus className="h-4 w-4" />
                    No change
                  </span>
                )}
                <span className="text-xs text-gray-500">vs last month</span>
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/30">
              <TrendingUp className="h-6 w-6 text-indigo-300" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-400">This Month Income</p>
              <ArrowUpRight className="h-4 w-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-400">{formatINR(monthly.income)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-400">This Month Expense</p>
              <ArrowDownRight className="h-4 w-4 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-red-400">{formatINR(monthly.expense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-400">This Month Savings</p>
              {monthly.savings >= 0 ? (
                <TrendingUp className="h-4 w-4 text-indigo-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-orange-400" />
              )}
            </div>
            <p className={`text-2xl font-bold ${monthly.savings >= 0 ? 'text-indigo-400' : 'text-orange-400'}`}>
              {formatINR(monthly.savings)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Asset Allocation */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            {assetAllocation.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
                No holdings data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={assetAllocation}
                    dataKey="value"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {assetAllocation.map((entry) => (
                      <Cell
                        key={entry.type}
                        fill={ASSET_COLORS[entry.type] || '#6b7280'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [formatINR(value), 'Value']}
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#e5e7eb' }}
                    itemStyle={{ color: '#9ca3af' }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span className="text-xs text-gray-400">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
                No transactions yet
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          backgroundColor: txn.category.color + '33',
                          color: txn.category.color,
                        }}
                      >
                        {txn.category.name[0]}
                      </div>
                      <div>
                        <p className="text-sm text-gray-200">{txn.category.name}</p>
                        <p className="text-xs text-gray-500">{formatDate(txn.txnDate)}</p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-semibold ${txn.type === 'income' ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {txn.type === 'income' ? '+' : '-'}
                      {formatINR(Number(txn.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table */}
      {holdings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-2 text-gray-400 font-medium">Name</th>
                    <th className="text-left py-3 px-2 text-gray-400 font-medium">Type</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium">Current Value</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium">Invested</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium">Gain/Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => (
                    <tr key={h.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-3 px-2 text-gray-200">{h.name}</td>
                      <td className="py-3 px-2">
                        <Badge
                          style={{ backgroundColor: (ASSET_COLORS[h.type] || '#6b7280') + '33', color: ASSET_COLORS[h.type] || '#6b7280' }}
                        >
                          {h.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-right text-gray-200">
                        {formatINR(h.currentValue)}
                      </td>
                      <td className="py-3 px-2 text-right text-gray-400">
                        {h.investedAmount ? formatINR(Number(h.investedAmount)) : '-'}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {h.gainLoss !== null ? (
                          <span className={h.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {formatINR(h.gainLoss)}
                            {h.gainLossPct !== null && (
                              <span className="text-xs ml-1">({formatPct(h.gainLossPct)})</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
