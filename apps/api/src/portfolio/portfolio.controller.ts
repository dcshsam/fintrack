import { Controller, Get, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PortfolioService } from './portfolio.service';
import { BulkUpsertSnapshotsDto } from './dto/portfolio.dto';

@Controller('portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(private portfolioService: PortfolioService) {}

  @Get('networth')
  getNetworth(
    @CurrentUser('id') userId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.portfolioService.getNetworthTimeSeries(userId, from, to);
  }

  @Get(':period')
  getSnapshotsForPeriod(@CurrentUser('id') userId: string, @Param('period') period: string) {
    return this.portfolioService.getSnapshotsForPeriod(userId, period);
  }

  @Put(':period')
  bulkUpsertSnapshots(
    @CurrentUser('id') userId: string,
    @Param('period') period: string,
    @Body() dto: BulkUpsertSnapshotsDto,
  ) {
    return this.portfolioService.bulkUpsertSnapshots(userId, period, dto);
  }
}
