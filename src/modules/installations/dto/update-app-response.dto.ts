import { ApiProperty } from '@nestjs/swagger';

export class UpdateAppResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'App update initiated successfully' })
  message: string;

  @ApiProperty()
  data: {
    installation_id: number;
    app_id: string;
    app_name: string;
    previous_version: string;
    new_version: string;
    installation_status: string;
    download_url: string;
    expires_at: string;
    update_instructions: string;
  };

  @ApiProperty()
  meta: {
    request_id: string;
    timestamp: string;
  };
}