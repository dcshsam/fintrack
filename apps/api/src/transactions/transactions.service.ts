import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateTransactionDto, UpdateTransactionDto, TransactionQueryDto } from './dto/transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, query: TransactionQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (query.from || query.to) {
      where.txnDate = {};
      if (query.from) where.txnDate.gte = new Date(query.from);
      if (query.to) where.txnDate.lte = new Date(query.to);
    }
    if (query.type) where.type = query.type;
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.q) {
      where.note = { contains: query.q, mode: 'insensitive' };
    }

    const [total, data] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ txnDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          category: { select: { id: true, name: true, color: true, type: true } },
          paymentMethod: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async create(userId: string, dto: CreateTransactionDto) {
    return this.prisma.transaction.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        paymentMethodId: dto.paymentMethodId,
        type: dto.type,
        amount: dto.amount,
        txnDate: new Date(dto.txnDate),
        note: dto.note,
      },
      include: {
        category: { select: { id: true, name: true, color: true, type: true } },
        paymentMethod: { select: { id: true, name: true } },
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const txn = await this.prisma.transaction.findFirst({ where: { id, userId } });
    if (!txn) throw new NotFoundException('Transaction not found');

    const data: any = { ...dto };
    if (dto.txnDate) data.txnDate = new Date(dto.txnDate);

    return this.prisma.transaction.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true, color: true, type: true } },
        paymentMethod: { select: { id: true, name: true } },
      },
    });
  }

  async remove(userId: string, id: string) {
    const txn = await this.prisma.transaction.findFirst({ where: { id, userId } });
    if (!txn) throw new NotFoundException('Transaction not found');
    return this.prisma.transaction.delete({ where: { id } });
  }
}
