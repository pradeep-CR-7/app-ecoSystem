import { IsString, IsNotEmpty, IsOptional, IsEmail, IsUrl, MaxLength, MinLength, Matches, IsArray, IsJSON } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class SubmitAppDto {
  @ApiProperty({ description: 'Unique app identifier', example: 'my-awesome-app' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9-_]+$/, { message: 'App ID can only contain alphanumeric characters, hyphens, and underscores' })
  app_id: string;

  @ApiProperty({ description: 'App display name', example: 'My Awesome App' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'App description', example: 'This is an amazing productivity app' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;

  @ApiProperty({ description: 'Version number', example: 'v1.0.0' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^v?\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?$/, { message: 'Version must follow semantic versioning (e.g., v1.0.0, 1.0.0)' })
  version_number: string;

  @ApiProperty({ description: 'App category', example: 'Productivity' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category: string;

  @ApiProperty({ description: 'Version changelog', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  changelog?: string;

  @ApiProperty({ description: 'Comma-separated tags', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  tags?: string;

  @ApiProperty({ description: 'App icon URL', required: false })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  icon_url?: string;

  @ApiProperty({ description: 'JSON array of screenshot URLs', required: false })
  @IsOptional()
  @IsString()
  screenshots?: string;

  @ApiProperty({ description: 'App website URL', required: false })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  website_url?: string;

  @ApiProperty({ description: 'Support email', required: false })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  support_email?: string;

  @ApiProperty({ description: 'JSON array of supported platforms', required: false })
  @IsOptional()
  @IsString()
  supported_platforms?: string;

  @ApiProperty({ description: 'Minimum platform version', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  minimum_platform_version?: string;
}