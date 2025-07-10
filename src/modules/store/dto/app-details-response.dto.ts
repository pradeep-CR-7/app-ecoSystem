import { ApiProperty } from '@nestjs/swagger';

export class AppVersionDto {
  @ApiProperty({ example: 'v1.0.0' })
  version_number: string;

  @ApiProperty({ example: 'Initial release with core features' })
  changelog: string;

  @ApiProperty({ example: '2025-07-09T10:30:00Z' })
  uploaded_at: string;

  @ApiProperty({ example: true })
  is_latest: boolean;

  @ApiProperty({ example: 'completed' })
  upload_status: string;

  @ApiProperty({ example: 1234567 })
  file_size_bytes: number;
}

export class DeveloperInfoDto {
  @ApiProperty({ example: 'dev123' })
  developer_id: string;

  @ApiProperty({ example: 'John Developer' })
  name: string;

  @ApiProperty({ example: 'TechCorp Inc' })
  company_name: string;

  @ApiProperty({ example: 'https://techcorp.com' })
  website_url: string;

  @ApiProperty({ example: 'john@techcorp.com' })
  email: string;
}

export class AppDetailsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'App details retrieved successfully' })
  message: string;

  @ApiProperty()
  data: {
    app_id: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    icon_url: string;
    screenshots: string[];
    website_url: string;
    support_email: string;
    privacy_policy_url: string;
    terms_of_service_url: string;
    is_published: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    latest_version: string;
    version_count: number;
    developer: DeveloperInfoDto;
    versions: AppVersionDto[];
  };
}
