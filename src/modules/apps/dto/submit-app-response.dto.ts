import { ApiProperty } from '@nestjs/swagger';

export class SubmitAppResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'App submitted successfully' })
  message: string;

  @ApiProperty()
  data: {
    app_id: string;
    name: string;
    version_number: string;
    developer_id: string;
    upload_status: string;
    s3_file_url: string;
    file_size_bytes: number;
    uploaded_at: string;
    is_published: boolean;
  };

  @ApiProperty()
  meta: {
    request_id: string;
    timestamp: string;
  };
}