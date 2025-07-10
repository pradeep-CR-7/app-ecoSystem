import { ApiProperty } from '@nestjs/swagger';

export class AppListItemDto {
  @ApiProperty({ example: 'my-awesome-app' })
  app_id: string;

  @ApiProperty({ example: 'My Awesome App' })
  name: string;

  @ApiProperty({ example: 'This is an amazing productivity app' })
  description: string;

  @ApiProperty({ example: 'Productivity' })
  category: string;

  @ApiProperty({ example: ['productivity', 'tasks', 'notes'] })
  tags: string[];

  @ApiProperty({ example: 'https://example.com/icon.png' })
  icon_url: string;

  @ApiProperty({ example: ['https://example.com/screenshot1.png'] })
  screenshots: string[];

  @ApiProperty({ example: 'dev123' })
  developer_id: string;

  @ApiProperty({ example: 'TechCorp Inc' })
  developer_name: string;

  @ApiProperty({ example: 'v1.0.0' })
  latest_version: string;

  @ApiProperty({ example: '2025-07-09T10:30:00Z' })
  updated_at: string;

  @ApiProperty({ example: true })
  is_published: boolean;
}

export class AppListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Apps retrieved successfully' })
  message: string;

  @ApiProperty({ type: [AppListItemDto] })
  data: AppListItemDto[];

  @ApiProperty()
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  @ApiProperty()
  filters: {
    category: string;
    search: string;
    developer: string;
  };
}