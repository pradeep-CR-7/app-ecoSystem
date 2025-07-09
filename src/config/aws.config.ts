import { ConfigService } from '@nestjs/config';

export const awsConfig = (configService: ConfigService) => ({
  accessKeyId: configService.get('AWS_ACCESS_KEY_ID'),
  secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY'),
  region: configService.get('AWS_REGION'),
  s3: {
    bucket: configService.get('AWS_S3_BUCKET'),
  },
});