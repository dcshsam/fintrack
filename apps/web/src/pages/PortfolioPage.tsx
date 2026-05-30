import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { portfolioApi } from '../api/portfolio';
import { holdingsApi, Holding } from '../api/holdings';
import { formatINR, formatPct, currentPeriod, periodLabel, prevPeriod, nextPeriod } from '../lib/format';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

const TYPE_COLORS: Record<string, string> = {
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

export default function PortfolioPage() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(currentPeriod());
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const now = new Date();
  const maxPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const { data: holdings = [] } = useQuery<Holding[]>({
    queryKey: ['holdings'],
    queryFn: holdingsApi.getAll,
  });

  const { data: snapshots = [] } = useQuery({
    queryKey: ['portfolio', period],
    queryFn: () => portfolioApi.getForPeriod(period),
  });

  useEffect(() => {
    if (snapshots.length > 0) {
      const vals: Record<string, string> = {};
      const nts: Record<string, string> = {};
      for (const s of snapshots) {
        vals[s.holding.id] = s.value;
        if (s.note) nts[s.holding.id] = s.note;
      }
      setValues(vals);
      setNotes(nts);
    }
  }, [snapshots]);

  // Net worth time series (last 12 months)
  const fromPeriod = (() => {
    const [y, m] = period.split('-').map(Number);
    const d = new Date(y, m - 12, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const { data: netWorthSeries = [] } = useQuery({
    queryKey: ['networth', fromPeriod, period],
    queryFn: () => portfolioApi.getNetworth(fromPeriod, period),
  });

  const upsertMutation = useMutation({
    mutationFn: (snapshotData: Array<{ holdingId: string; value: number; note?: string }>) =>
      portfolioApi.bulkUpsert(period, snapshotData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['networth'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSave = () => {
    const snapshotData = holdings
      .filter((h) => values[h.id] && Number(values[h.id]) > 0)
      .map((h) => ({
        holdingId: h.id,
        value: Number(values[h.id]),
        note: notes[h.id] || undefined,
      }));
    upsertMutation.mutate(snapshotData);
  };

  const totalNetWorth = holdings.reduce((sum, h) => {
    const val = values[h.id];
    return sum + (val ? Number(val) : 0);
  }, 0);

  const snapshotMap = new Map(snapshots.map((s) => [s.holding.id, s]));

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Portfolio</h1>
          <p className="text-sm text-gray-500 mt-1">Track your net worth month by month</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setValues({});
              setPeriod(prevPeriod(period));
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-gray-200 min-w-32 text-center">
            {periodLabel(period)}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={period >= maxPeriod}
            onClick={() => {
              setValues({});
              setPeriod(nextPeriod(period));
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Net Worth Card */}
      <Card className="bg-gradient-to-br from-indigo-600/20 to-purple-600/10 border-indigo-500/30">
        <CardContent className="p-6">
          <p className="text-sm text-gray-400 mb-1">Portfolio Value — {periodLabel(period)}</p>
          <p className="text-3xl font-bold text-white">{formatINR(totalNetWorth)}</p>
        </CardContent>
      </Card>

      {/* Net Worth Chart */}
      {netWorthSeries.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Net Worth Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={netWorthSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="period"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatINR(v, true)}
                />
                <Tooltip
                  formatter={(v: number) => [formatINR(v), 'Net Worth']}
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#e5e7eb' }}
                  itemStyle={{ color: '#9ca3af' }}
                />
                <Line
                  type="monotone"
                  dataKey="netWorth"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Holdings Value Entry */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle>Update Holdings Values</CardTitle>
          <Button onClick={handleSave} disabled={upsertMutation.isPending || holdings.length === 0}>
            <Save className="h-4 w-4 mr-2" />
            {upsertMutation.isPending ? 'Saving...' : saved ? 'Saved!' : 'Save Portfolio'}
          </Button>
        </CardHeader>
        <CardContent>
          {holdings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No holdings yet. Add holdings first.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {holdings.map((h) => {
                const existing = snapshotMap.get(h.id);
                const invested = h.investedAmount ? Number(h.investedAmount) : null;
                const currentVal = values[h.id] ? Number(values[h.id]) : null;
                const gainLoss = currentVal !== null && invested !== null ? currentVal - invested : null;
                return (
                  <div
                    key={h.id}
                    className="rounded-lg border border-gray-800 bg-gray-800/30 p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          style={{
                            backgroundColor: (TYPE_COLORS[h.type] || '#6b7280') + '33',
                            color: TYPE_COLORS[h.type] || '#6b7280',
                          }}
                        >
                          {h.type}
                        </Badge>
                        <span className="font-medium text-gray-200">{h.name}</span>
                        {existing && (
                          <span className="text-xs text-gray-500">
                            Last: {formatINR(Number(existing.value))}
                          </span>
                        )}
                      </div>
                      {gainLoss !== null && (
                        <span className={`text-sm font-medium ${gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {gainLoss >= 0 ? '+' : ''}{formatINR(gainLoss)}
                          {invested !== null && currentVal !== null && (
                            <span className="ml-1 text-xs">
                              ({formatPct(((currentVal - invested) / invested) * 100)})
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Current Value (₹)
                          {invested !== null && (
                            <span className="ml-1 text-gray-600">Invested: {formatINR(invested)}</span>
                          )}
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={values[h.id] || ''}
                          onChange={(e) => setValues((v) => ({ ...v, [h.id]: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Note (optional)</label>
                        <Input
                          placeholder="Any notes..."
                          value={notes[h.id] || ''}
                          onChange={(e) => setNotes((n) => ({ ...n, [h.id]: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
