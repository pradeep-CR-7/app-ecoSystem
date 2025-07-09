import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class S3Service {
  private s3: AWS.S3;
  private readonly logger = new Logger(S3Service.name);

  constructor(private configService: ConfigService) {
    this.s3 = new AWS.S3({
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_REGION'),
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    developerId: string,
    appId: string,
    versionNumber: string,
  ): Promise<{ url: string; key: string; size: number }> {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${appId}_${versionNumber}.${fileExtension}`;
    const key = `${developerId}/${appId}/${versionNumber}/${fileName}`;

    const params = {
      Bucket: this.configService.get('AWS_S3_BUCKET'),
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        'original-name': file.originalname,
        'developer-id': developerId,
        'app-id': appId,
        'version': versionNumber,
      },
    };

    try {
      const result = await this.s3.upload(params).promise();
      this.logger.log(`File uploaded successfully: ${result.Location}`);
      
      return {
        url: result.Location,
        key: key,
        size: file.size,
      };
    } catch (error) {
      this.logger.error(`S3 upload failed: ${error.message}`);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }
}