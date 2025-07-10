import { ApiProperty } from '@nestjs/swagger';

export class AppStatusDto {
  @ApiProperty({ example: 'my-awesome-app' })
  app_id: string;

  @ApiProperty({ example: 'My Awesome App' })
  name: string;

  @ApiProperty({ example: 'dev123' })
  developer_id: string;

  @ApiProperty({ example: true })
  is_published: boolean;

  @ApiProperty({ example: true })
  is_active: boolean;

  @ApiProperty({ example: 'v1.0.0' })
  latest_version: string;

  @ApiProperty({ example: 3 })
  version_count: number;

  @ApiProperty({ example: '2025-07-09T10:30:00Z' })
  published_at: string;

  @ApiProperty({ example: '2025-07-09T10:30:00Z' })
  created_at: string;

  @ApiProperty({ example: '2025-07-09T10:30:00Z' })
  updated_at: string;
}