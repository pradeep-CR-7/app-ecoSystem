import { ApiProperty } from '@nestjs/swagger';

export class DeleteAppResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'App uninstalled successfully' })
  message: string;

  @ApiProperty()
  data: {
    installation_id: number;
    merchant_id: string;
    app_id: string;
    app_name: string;
    previous_status: string;
    uninstalled_at: string;
  };

  @ApiProperty()
  meta: {
    request_id: string;
    timestamp: string;
  };
}