import { Module } from '@nestjs/common';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { TransactionsModule } from './transactions/transactions.module';
import { HoldingsModule } from './holdings/holdings.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CategoriesModule,
    PaymentMethodsModule,
    TransactionsModule,
    HoldingsModule,
    PortfolioModule,
    DashboardModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
