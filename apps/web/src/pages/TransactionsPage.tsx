import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Search, Filter } from 'lucide-react';
import { transactionsApi, Transaction, TransactionFilters } from '../api/transactions';
import { categoriesApi, Category } from '../api/categories';
import { formatINR, formatDate } from '../lib/format';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '../components/ui/dialog';

const txnSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  paymentMethodId: z.string().optional(),
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive('Amount must be positive'),
  txnDate: z.string().min(1, 'Date is required'),
  note: z.string().max(500).optional(),
});

type TxnForm = z.infer<typeof txnSchema>;

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<TransactionFilters>({ page: 1, limit: 20 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => transactionsApi.getAll(filters),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: transactionsApi.getPaymentMethods,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TxnForm>({
    resolver: zodResolver(txnSchema),
    defaultValues: { type: 'expense', txnDate: new Date().toISOString().split('T')[0] },
  });

  const createMutation = useMutation({
    mutationFn: transactionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TxnForm> }) =>
      transactionsApi.update(id, { ...data, amount: data.amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: transactionsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleteId(null);
    },
  });

  const openCreate = () => {
    setEditing(null);
    reset({ type: 'expense', txnDate: new Date().toISOString().split('T')[0] });
    setDialogOpen(true);
  };

  const openEdit = (txn: Transaction) => {
    setEditing(txn);
    reset({
      categoryId: txn.categoryId,
      paymentMethodId: txn.paymentMethodId || '',
      type: txn.type as 'income' | 'expense',
      amount: Number(txn.amount),
      txnDate: txn.txnDate.split('T')[0],
      note: txn.note || '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const onSubmit = async (formData: TxnForm) => {
    const payload = {
      ...formData,
      paymentMethodId: formData.paymentMethodId || undefined,
      note: formData.note || undefined,
    };
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Transactions</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data?.total ?? 0} total transactions
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Transaction
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-40">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search notes..."
                className="pl-9"
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))}
              />
            </div>
            <Select
              className="w-36"
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value || undefined, page: 1 }))}
            >
              <option value="">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </Select>
            <Select
              className="w-44"
              onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value || undefined, page: 1 }))}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                className="w-36"
                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value || undefined, page: 1 }))}
              />
              <span className="text-gray-500 text-sm">to</span>
              <Input
                type="date"
                className="w-36"
                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value || undefined, page: 1 }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-gray-500">Loading...</div>
          ) : data?.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <Filter className="h-8 w-8 mb-2 opacity-50" />
              <p>No transactions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-6 text-gray-400 font-medium">Date</th>
                    <th className="text-left py-3 px-6 text-gray-400 font-medium">Category</th>
                    <th className="text-left py-3 px-6 text-gray-400 font-medium">Note</th>
                    <th className="text-left py-3 px-6 text-gray-400 font-medium">Payment</th>
                    <th className="text-right py-3 px-6 text-gray-400 font-medium">Amount</th>
                    <th className="py-3 px-6" />
                  </tr>
                </thead>
                <tbody>
                  {data?.data.map((txn) => (
                    <tr key={txn.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-3 px-6 text-gray-400">{formatDate(txn.txnDate)}</td>
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: txn.category.color }}
                          />
                          <span className="text-gray-200">{txn.category.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-6 text-gray-400 max-w-xs truncate">
                        {txn.note || '-'}
                      </td>
                      <td className="py-3 px-6 text-gray-400">
                        {txn.paymentMethod?.name || '-'}
                      </td>
                      <td className="py-3 px-6 text-right">
                        <span
                          className={`font-semibold ${txn.type === 'income' ? 'text-green-400' : 'text-red-400'}`}
                        >
                          {txn.type === 'income' ? '+' : '-'}
                          {formatINR(Number(txn.amount))}
                        </span>
                      </td>
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(txn)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(txn.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
              <span className="text-sm text-gray-500">
                Page {data.page} of {data.pages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page >= data.pages}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog}>
        <DialogHeader onClose={closeDialog}>
          <DialogTitle>{editing ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Type</label>
                <Select {...register('type')}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </Select>
                {errors.type && <p className="mt-1 text-xs text-red-400">{errors.type.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Amount (₹)</label>
                <Input type="number" step="0.01" placeholder="0.00" {...register('amount')} />
                {errors.amount && <p className="mt-1 text-xs text-red-400">{errors.amount.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Category</label>
              <Select {...register('categoryId')}>
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                ))}
              </Select>
              {errors.categoryId && <p className="mt-1 text-xs text-red-400">{errors.categoryId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Date</label>
              <Input type="date" {...register('txnDate')} />
              {errors.txnDate && <p className="mt-1 text-xs text-red-400">{errors.txnDate.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Payment Method</label>
              <Select {...register('paymentMethodId')}>
                <option value="">None</option>
                {paymentMethods.map((pm) => (
                  <option key={pm.id} value={pm.id}>{pm.name}</option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Note</label>
              <Input placeholder="Optional note..." {...register('note')} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={closeDialog}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editing ? 'Save Changes' : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogHeader onClose={() => setDeleteId(null)}>
          <DialogTitle>Delete Transaction</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-gray-300">Are you sure you want to delete this transaction? This action cannot be undone.</p>
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
