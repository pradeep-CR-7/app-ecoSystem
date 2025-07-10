import { ApiProperty } from '@nestjs/swagger';

export class InstallAppResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'App installation initiated successfully' })
  message: string;

  @ApiProperty()
  data: {
    installation_id: number;
    merchant_id: string;
    app_id: string;
    app_name: string;
    version_number: string;
    installation_status: string;
    download_url: string;
    expires_at: string;
    install_instructions: string;
  };

  @ApiProperty()
  meta: {
    request_id: string;
    timestamp: string;
  };
}
