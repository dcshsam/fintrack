import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BulkUpsertSnapshotsDto } from './dto/portfolio.dto';

@Injectable()
export class PortfolioService {
  constructor(private prisma: PrismaService) {}

  private validatePeriod(period: string) {
    if (!/^\d{4}-\d{2}$/.test(period)) {
      throw new BadRequestException('Period must be in YYYY-MM format');
    }
  }

  async getSnapshotsForPeriod(userId: string, period: string) {
    this.validatePeriod(period);
    const snapshots = await this.prisma.holdingSnapshot.findMany({
      where: { userId, period },
      include: {
        holding: { select: { id: true, name: true, type: true, investedAmount: true } },
      },
      orderBy: { holding: { name: 'asc' } },
    });
    return snapshots;
  }

  async bulkUpsertSnapshots(userId: string, period: string, dto: BulkUpsertSnapshotsDto) {
    this.validatePeriod(period);

    const [year, month] = period.split('-').map(Number);
    const asOfDate = new Date(year, month - 1 + 1, 0); // last day of month

    const results = await Promise.all(
      dto.snapshots.map(async (item) => {
        const holding = await this.prisma.holding.findFirst({
          where: { id: item.holdingId, userId },
        });
        if (!holding) return null;

        return this.prisma.holdingSnapshot.upsert({
          where: { holdingId_period: { holdingId: item.holdingId, period } },
          create: {
            userId,
            holdingId: item.holdingId,
            period,
            value: item.value,
            asOfDate,
            note: item.note,
          },
          update: {
            value: item.value,
            asOfDate,
            note: item.note,
          },
        });
      }),
    );

    return results.filter(Boolean);
  }

  async getNetworthTimeSeries(userId: string, from: string, to: string) {
    this.validatePeriod(from);
    this.validatePeriod(to);

    const snapshots = await this.prisma.holdingSnapshot.findMany({
      where: {
        userId,
        period: { gte: from, lte: to },
      },
      select: { period: true, value: true },
      orderBy: { period: 'asc' },
    });

    const byPeriod = new Map<string, number>();
    for (const s of snapshots) {
      const current = byPeriod.get(s.period) || 0;
      byPeriod.set(s.period, current + Number(s.value));
    }

    const series = Array.from(byPeriod.entries()).map(([period, netWorth]) => ({
      period,
      netWorth,
    }));
    series.sort((a, b) => a.period.localeCompare(b.period));
    return series;
  }
}
