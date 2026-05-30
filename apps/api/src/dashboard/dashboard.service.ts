import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(userId: string) {
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevPeriod = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Latest net worth - find the most recent period with data
    const latestSnapshots = await this.prisma.holdingSnapshot.findMany({
      where: { userId },
      orderBy: { period: 'desc' },
      distinct: ['period'],
      take: 1,
      select: { period: true },
    });

    const latestPeriod = latestSnapshots[0]?.period || currentPeriod;

    const [latestSnapshotRows, prevSnapshotRows] = await Promise.all([
      this.prisma.holdingSnapshot.findMany({
        where: { userId, period: latestPeriod },
        select: { value: true },
      }),
      this.prisma.holdingSnapshot.findMany({
        where: { userId, period: prevPeriod },
        select: { value: true },
      }),
    ]);

    const latestNetWorth = latestSnapshotRows.reduce((sum, s) => sum + Number(s.value), 0);
    const prevNetWorth = prevSnapshotRows.reduce((sum, s) => sum + Number(s.value), 0);
    const networthChange = latestNetWorth - prevNetWorth;
    const networthChangePct = prevNetWorth > 0 ? (networthChange / prevNetWorth) * 100 : 0;

    // Asset allocation by type
    const holdings = await this.prisma.holding.findMany({
      where: { userId },
      select: { id: true, name: true, type: true, investedAmount: true },
    });

    const snapshotsByHolding = await this.prisma.holdingSnapshot.findMany({
      where: { userId, period: latestPeriod },
      select: { holdingId: true, value: true },
    });

    const snapshotMap = new Map(snapshotsByHolding.map((s) => [s.holdingId, Number(s.value)]));

    const allocationByType = new Map<string, number>();
    for (const h of holdings) {
      const value = snapshotMap.get(h.id) || 0;
      allocationByType.set(h.type, (allocationByType.get(h.type) || 0) + value);
    }

    const assetAllocation = Array.from(allocationByType.entries()).map(([type, value]) => ({
      type,
      value,
      percentage: latestNetWorth > 0 ? (value / latestNetWorth) * 100 : 0,
    }));

    // Holdings with gain/loss
    const holdingsWithGainLoss = holdings.map((h) => {
      const currentValue = snapshotMap.get(h.id) || 0;
      const invested = h.investedAmount ? Number(h.investedAmount) : 0;
      const gainLoss = invested > 0 ? currentValue - invested : null;
      const gainLossPct = invested > 0 ? ((currentValue - invested) / invested) * 100 : null;
      return { ...h, currentValue, gainLoss, gainLossPct };
    });

    // Monthly transactions
    const [incomeResult, expenseResult] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { userId, type: 'income', txnDate: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId, type: 'expense', txnDate: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
    ]);

    const monthlyIncome = Number(incomeResult._sum.amount || 0);
    const monthlyExpense = Number(expenseResult._sum.amount || 0);
    const monthlySavings = monthlyIncome - monthlyExpense;

    // Recent transactions
    const recentTransactions = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: [{ txnDate: 'desc' }, { createdAt: 'desc' }],
      take: 5,
      include: {
        category: { select: { id: true, name: true, color: true, type: true } },
        paymentMethod: { select: { id: true, name: true } },
      },
    });

    return {
      netWorth: {
        current: latestNetWorth,
        previous: prevNetWorth,
        change: networthChange,
        changePct: networthChangePct,
        period: latestPeriod,
      },
      assetAllocation,
      holdings: holdingsWithGainLoss,
      monthly: {
        income: monthlyIncome,
        expense: monthlyExpense,
        savings: monthlySavings,
        period: currentPeriod,
      },
      recentTransactions,
    };
  }
}
