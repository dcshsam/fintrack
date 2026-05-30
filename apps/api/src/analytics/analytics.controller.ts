import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('monthly')
  getMonthly(@CurrentUser('id') userId: string, @Query('period') period: string) {
    return this.analyticsService.getMonthlyAnalytics(userId, period);
  }

  @Get('yearly')
  getYearly(@CurrentUser('id') userId: string, @Query('year') year: string) {
    return this.analyticsService.getYearlyAnalytics(userId, year);
  }
}
