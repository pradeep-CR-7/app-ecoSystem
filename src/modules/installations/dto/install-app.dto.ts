import { IsString, IsNotEmpty, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InstallAppDto {
  @ApiProperty({ description: 'App ID to install', example: 'my-awesome-app' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  app_id: string;

  @ApiProperty({ description: 'Specific version to install (optional, defaults to latest)', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  version_number?: string;
}