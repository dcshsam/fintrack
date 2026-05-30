import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  private validatePeriod(period: string) {
    if (!/^\d{4}-\d{2}$/.test(period)) {
      throw new BadRequestException('Period must be in YYYY-MM format');
    }
  }

  async getMonthlyAnalytics(userId: string, period: string) {
    this.validatePeriod(period);
    const [year, month] = period.split('-').map(Number);

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        txnDate: { gte: monthStart, lte: monthEnd },
      },
      include: {
        category: { select: { id: true, name: true, color: true, type: true } },
      },
      orderBy: { txnDate: 'asc' },
    });

    let income = 0;
    let expense = 0;
    const spendByCategory = new Map<string, { name: string; color: string; amount: number }>();
    const dailySpend = new Map<string, number>();

    for (const txn of transactions) {
      const amount = Number(txn.amount);
      if (txn.type === 'income') {
        income += amount;
      } else {
        expense += amount;
        const catKey = txn.categoryId;
        const existing = spendByCategory.get(catKey);
        if (existing) {
          existing.amount += amount;
        } else {
          spendByCategory.set(catKey, {
            name: txn.category.name,
            color: txn.category.color,
            amount,
          });
        }
        const dateKey = txn.txnDate.toISOString().split('T')[0];
        dailySpend.set(dateKey, (dailySpend.get(dateKey) || 0) + amount);
      }
    }

    // Portfolio value for month
    const snapshots = await this.prisma.holdingSnapshot.findMany({
      where: { userId, period },
      select: { value: true },
    });
    const portfolioValue = snapshots.reduce((sum, s) => sum + Number(s.value), 0);

    // Build daily spend array for entire month
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailySpendArray = Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1).padStart(2, '0');
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${day}`;
      return { date: dateStr, amount: dailySpend.get(dateStr) || 0 };
    });

    return {
      period,
      income,
      expense,
      savings: income - expense,
      savingsRate: income > 0 ? ((income - expense) / income) * 100 : 0,
      spendByCategory: Array.from(spendByCategory.values()).sort((a, b) => b.amount - a.amount),
      dailySpend: dailySpendArray,
      portfolioValue,
    };
  }

  async getYearlyAnalytics(userId: string, year: string) {
    if (!/^\d{4}$/.test(year)) {
      throw new BadRequestException('Year must be in YYYY format');
    }

    const yearNum = parseInt(year, 10);
    const months = Array.from({ length: 12 }, (_, i) => {
      const m = String(i + 1).padStart(2, '0');
      return `${year}-${m}`;
    });

    const yearStart = new Date(yearNum, 0, 1);
    const yearEnd = new Date(yearNum, 11, 31);

    const [transactions, allSnapshots] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId, txnDate: { gte: yearStart, lte: yearEnd } },
        include: { category: { select: { id: true, name: true, color: true } } },
      }),
      this.prisma.holdingSnapshot.findMany({
        where: { userId, period: { gte: `${year}-01`, lte: `${year}-12` } },
        select: { period: true, value: true },
      }),
    ]);

    // Build monthly bars
    const monthlyData = months.map((period) => {
      const [, m] = period.split('-').map(Number);
      const mStart = new Date(yearNum, m - 1, 1);
      const mEnd = new Date(yearNum, m, 0);

      let income = 0;
      let expense = 0;
      for (const txn of transactions) {
        if (txn.txnDate >= mStart && txn.txnDate <= mEnd) {
          if (txn.type === 'income') income += Number(txn.amount);
          else expense += Number(txn.amount);
        }
      }

      const netWorth = allSnapshots
        .filter((s) => s.period === period)
        .reduce((sum, s) => sum + Number(s.value), 0);

      return { period, income, expense, savings: income - expense, netWorth };
    });

    // Top categories by total spend
    const categorySpend = new Map<string, { name: string; color: string; amount: number }>();
    for (const txn of transactions) {
      if (txn.type === 'expense') {
        const existing = categorySpend.get(txn.categoryId);
        if (existing) {
          existing.amount += Number(txn.amount);
        } else {
          categorySpend.set(txn.categoryId, {
            name: txn.category.name,
            color: txn.category.color,
            amount: Number(txn.amount),
          });
        }
      }
    }

    const topCategories = Array.from(categorySpend.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const totalIncome = monthlyData.reduce((sum, m) => sum + m.income, 0);
    const totalExpense = monthlyData.reduce((sum, m) => sum + m.expense, 0);
    const overallSavingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    const firstNetWorth = monthlyData.find((m) => m.netWorth > 0)?.netWorth || 0;
    const lastNetWorth = [...monthlyData].reverse().find((m) => m.netWorth > 0)?.netWorth || 0;
    const networthGrowth = firstNetWorth > 0 ? ((lastNetWorth - firstNetWorth) / firstNetWorth) * 100 : 0;

    return {
      year,
      monthly: monthlyData,
      totals: { income: totalIncome, expense: totalExpense, savings: totalIncome - totalExpense },
      savingsRate: overallSavingsRate,
      networthGrowth,
      topCategories,
    };
  }
}
