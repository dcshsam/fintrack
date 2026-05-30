import { IsString, IsIn, IsOptional, MinLength, MaxLength, IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

const HOLDING_TYPES = ['Equity', 'MutualFund', 'PF', 'FD', 'Gold', 'Crypto', 'Cash', 'RealEstate', 'Other'];

export class CreateHoldingDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @IsIn(HOLDING_TYPES)
  type: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  investedAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateHoldingDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsIn(HOLDING_TYPES)
  type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  investedAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
