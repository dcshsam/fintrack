import { IsString, IsUUID, IsNumber, IsPositive, IsOptional, IsArray, ValidateNested, Matches, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class SnapshotItemDto {
  @IsUUID()
  holdingId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  value: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class BulkUpsertSnapshotsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SnapshotItemDto)
  snapshots: SnapshotItemDto[];
}
