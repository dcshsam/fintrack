import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateHoldingDto, UpdateHoldingDto } from './dto/holding.dto';

@Injectable()
export class HoldingsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.holding.findMany({
      where: { userId },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: {
        snapshots: {
          orderBy: { period: 'desc' },
          take: 1,
        },
      },
    });
  }

  findOne(userId: string, id: string) {
    return this.prisma.holding.findFirst({
      where: { id, userId },
      include: { snapshots: { orderBy: { period: 'desc' } } },
    });
  }

  create(userId: string, dto: CreateHoldingDto) {
    return this.prisma.holding.create({
      data: { ...dto, userId },
    });
  }

  async update(userId: string, id: string, dto: UpdateHoldingDto) {
    const holding = await this.prisma.holding.findFirst({ where: { id, userId } });
    if (!holding) throw new NotFoundException('Holding not found');
    return this.prisma.holding.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    const holding = await this.prisma.holding.findFirst({ where: { id, userId } });
    if (!holding) throw new NotFoundException('Holding not found');
    return this.prisma.holding.delete({ where: { id } });
  }
}
