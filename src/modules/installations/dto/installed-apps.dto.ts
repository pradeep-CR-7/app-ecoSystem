import { ApiProperty } from '@nestjs/swagger';

export class InstalledAppDto {
  @ApiProperty({ example: 1 })
  installation_id: number;

  @ApiProperty({ example: 'my-awesome-app' })
  app_id: string;

  @ApiProperty({ example: 'My Awesome App' })
  app_name: string;

  @ApiProperty({ example: 'v1.0.0' })
  version_number: string;

  @ApiProperty({ example: 'installed' })
  installation_status: string;

  @ApiProperty({ example: '2025-07-09T10:30:00Z' })
  installed_at: string;

  @ApiProperty({ example: '2025-07-09T12:30:00Z' })
  updated_at: string;

  @ApiProperty({ example: 'TechCorp Inc' })
  developer_name: string;

  @ApiProperty({ example: 'Productivity' })
  category: string;
}