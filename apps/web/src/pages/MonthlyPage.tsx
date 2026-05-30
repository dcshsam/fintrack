import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { analyticsApi } from '../api/analytics';
import {
  formatINR,
  formatPct,
  currentPeriod,
  periodLabel,
  prevPeriod,
  nextPeriod,
} from '../lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function MonthlyPage() {
  const [period, setPeriod] = useState(currentPeriod());

  const now = new Date();
  const maxPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const { data, isLoading } = useQuery({
    queryKey: ['analytics-monthly', period],
    queryFn: () => analyticsApi.getMonthly(period),
  });

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header with month picker */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Monthly View</h1>
          <p className="text-sm text-gray-500 mt-1">Income, expenses and spending breakdown</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPeriod(prevPeriod(period))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-gray-200 min-w-36 text-center">
            {periodLabel(period)}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={period >= maxPeriod}
            onClick={() => setPeriod(nextPeriod(period))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-gray-500">Loading...</div>
      ) : !data ? null : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-400">Income</p>
                  <TrendingUp className="h-4 w-4 text-green-400" />
                </div>
                <p className="text-2xl font-bold text-green-400">{formatINR(data.income)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-400">Expense</p>
                  <TrendingDown className="h-4 w-4 text-red-400" />
                </div>
                <p className="text-2xl font-bold text-red-400">{formatINR(data.expense)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-400">Savings</p>
                  <TrendingUp className={`h-4 w-4 ${data.savings >= 0 ? 'text-indigo-400' : 'text-orange-400'}`} />
                </div>
                <p className={`text-2xl font-bold ${data.savings >= 0 ? 'text-indigo-400' : 'text-orange-400'}`}>
                  {formatINR(data.savings)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-400">Savings Rate</p>
                </div>
                <p className={`text-2xl font-bold ${data.savingsRate >= 20 ? 'text-green-400' : data.savingsRate >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {data.savingsRate.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Spend by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Spend by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {data.spendByCategory.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
                    No expenses this month
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={data.spendByCategory}
                      layout="vertical"
                      margin={{ left: 0, right: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatINR(v, true)}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        width={80}
                      />
                      <Tooltip
                        formatter={(v: number) => [formatINR(v), 'Spent']}
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                        labelStyle={{ color: '#e5e7eb' }}
                        itemStyle={{ color: '#9ca3af' }}
                      />
                      <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                        {data.spendByCategory.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Daily Spend Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Spend</CardTitle>
              </CardHeader>
              <CardContent>
                {data.dailySpend.every((d) => d.amount === 0) ? (
                  <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
                    No spending data
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={data.dailySpend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => v.split('-')[2]}
                      />
                      <YAxis
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatINR(v, true)}
                      />
                      <Tooltip
                        formatter={(v: number) => [formatINR(v), 'Spent']}
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                        labelStyle={{ color: '#e5e7eb' }}
                        itemStyle={{ color: '#9ca3af' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown Table */}
          {data.spendByCategory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.spendByCategory.map((cat, i) => {
                    const pct = data.expense > 0 ? (cat.amount / data.expense) * 100 : 0;
                    return (
                      <div key={i} className="flex items-center gap-4">
                        <div className="flex items-center gap-2 min-w-32">
                          <div
                            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-sm text-gray-300 truncate">{cat.name}</span>
                        </div>
                        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: cat.color }}
                          />
                        </div>
                        <div className="text-right min-w-28">
                          <span className="text-sm font-medium text-gray-200">{formatINR(cat.amount)}</span>
                          <span className="text-xs text-gray-500 ml-2">{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
