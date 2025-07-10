import { ApiProperty } from '@nestjs/swagger';

export class PublishAppResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'App published successfully' })
  message: string;

  @ApiProperty()
  data: {
    app_id: string;
    name: string;
    developer_id: string;
    is_published: boolean;
    published_at: string;
    latest_version: string;
    publishing_notes?: string;
  };

  @ApiProperty()
  meta: {
    request_id: string;
    timestamp: string;
  };
}