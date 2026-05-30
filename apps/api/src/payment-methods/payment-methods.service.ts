import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePaymentMethodDto, UpdatePaymentMethodDto } from './dto/payment-method.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(private prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  findOne(userId: string, id: string) {
    return this.prisma.paymentMethod.findFirst({ where: { id, userId } });
  }

  create(userId: string, dto: CreatePaymentMethodDto) {
    return this.prisma.paymentMethod.create({
      data: { ...dto, userId },
    });
  }

  async update(userId: string, id: string, dto: UpdatePaymentMethodDto) {
    const pm = await this.prisma.paymentMethod.findFirst({ where: { id, userId } });
    if (!pm) throw new NotFoundException('Payment method not found');
    return this.prisma.paymentMethod.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    const pm = await this.prisma.paymentMethod.findFirst({ where: { id, userId } });
    if (!pm) throw new NotFoundException('Payment method not found');
    return this.prisma.paymentMethod.delete({ where: { id } });
  }
}
