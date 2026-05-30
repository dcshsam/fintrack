import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { holdingsApi, Holding } from '../api/holdings';
import { formatINR } from '../lib/format';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '../components/ui/dialog';

const HOLDING_TYPES = ['Equity', 'MutualFund', 'PF', 'FD', 'Gold', 'Crypto', 'Cash', 'RealEstate', 'Other'];

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

const schema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().min(1),
  investedAmount: z.coerce.number().positive().optional().or(z.literal('')),
  note: z.string().max(500).optional(),
});

type FormData = z.infer<typeof schema>;

export default function HoldingsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Holding | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: holdings = [], isLoading } = useQuery<Holding[]>({
    queryKey: ['holdings'],
    queryFn: holdingsApi.getAll,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'Equity' },
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; type: string; investedAmount?: number; note?: string }) =>
      holdingsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => holdingsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: holdingsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      setDeleteId(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    reset({ type: 'Equity', name: '', note: '' });
    setDialogOpen(true);
  };

  const openEdit = (h: Holding) => {
    setEditing(h);
    reset({
      name: h.name,
      type: h.type,
      investedAmount: h.investedAmount ? Number(h.investedAmount) : '',
      note: h.note || '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const onSubmit = async (data: FormData) => {
    const payload = {
      name: data.name,
      type: data.type,
      investedAmount: data.investedAmount ? Number(data.investedAmount) : undefined,
      note: data.note || undefined,
    };
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  const totalInvested = holdings.reduce(
    (sum, h) => sum + (h.investedAmount ? Number(h.investedAmount) : 0),
    0,
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Holdings</h1>
          <p className="text-sm text-gray-500 mt-1">
            {holdings.length} holdings · Total invested: {formatINR(totalInvested)}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Holding
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : holdings.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="mb-2">No holdings yet</p>
              <p className="text-sm">Add your first holding to start tracking</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-6 text-gray-400 font-medium">Name</th>
                    <th className="text-left py-3 px-6 text-gray-400 font-medium">Type</th>
                    <th className="text-right py-3 px-6 text-gray-400 font-medium">Invested</th>
                    <th className="text-right py-3 px-6 text-gray-400 font-medium">Latest Value</th>
                    <th className="text-left py-3 px-6 text-gray-400 font-medium">Note</th>
                    <th className="py-3 px-6" />
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => {
                    const latestSnapshot = h.snapshots[0];
                    const currentValue = latestSnapshot ? Number(latestSnapshot.value) : null;
                    const invested = h.investedAmount ? Number(h.investedAmount) : null;
                    const gainLoss = currentValue !== null && invested !== null ? currentValue - invested : null;
                    return (
                      <tr key={h.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="py-3 px-6 font-medium text-gray-200">{h.name}</td>
                        <td className="py-3 px-6">
                          <Badge
                            style={{
                              backgroundColor: (TYPE_COLORS[h.type] || '#6b7280') + '33',
                              color: TYPE_COLORS[h.type] || '#6b7280',
                            }}
                          >
                            {h.type}
                          </Badge>
                        </td>
                        <td className="py-3 px-6 text-right text-gray-400">
                          {invested !== null ? formatINR(invested) : '-'}
                        </td>
                        <td className="py-3 px-6 text-right">
                          {currentValue !== null ? (
                            <div>
                              <span className="text-gray-200">{formatINR(currentValue)}</span>
                              {gainLoss !== null && (
                                <span className={`ml-2 text-xs ${gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  ({gainLoss >= 0 ? '+' : ''}{formatINR(gainLoss)})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500">No snapshot</span>
                          )}
                        </td>
                        <td className="py-3 px-6 text-gray-400 max-w-xs truncate">{h.note || '-'}</td>
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-1 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(h)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(h.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={closeDialog}>
        <DialogHeader onClose={closeDialog}>
          <DialogTitle>{editing ? 'Edit Holding' : 'Add Holding'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Name</label>
              <Input placeholder="e.g. HDFC Bank, SBI Gold ETF..." {...register('name')} />
              {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Type</label>
              <Select {...register('type')}>
                {HOLDING_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Invested Amount (₹) <span className="text-gray-500">optional</span>
              </label>
              <Input type="number" step="0.01" placeholder="0.00" {...register('investedAmount')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Note <span className="text-gray-500">optional</span>
              </label>
              <Input placeholder="Any notes about this holding..." {...register('note')} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={closeDialog}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editing ? 'Save Changes' : 'Add Holding'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogHeader onClose={() => setDeleteId(null)}>
          <DialogTitle>Delete Holding</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-gray-300">
            Are you sure? This will also delete all portfolio snapshots for this holding.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
