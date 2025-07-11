import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAppDto {
  @ApiProperty({ description: 'App ID to update', example: 'my-awesome-app' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  app_id: string;
}