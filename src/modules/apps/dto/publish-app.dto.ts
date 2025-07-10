import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PublishAppDto {
  @ApiProperty({ description: 'Publish status', example: true })
  @IsBoolean()
  is_published: boolean;

  @ApiProperty({ description: 'Publishing notes', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  publishing_notes?: string;
}