import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CloudFrontService {
  private readonly logger = new Logger(CloudFrontService.name);
  private readonly cloudFrontDomain: string;
  private readonly keyPairId: string;
  private readonly privateKey: string;

  constructor(private configService: ConfigService) {
    this.cloudFrontDomain = this.configService.get('CLOUDFRONT_DOMAIN');
    this.keyPairId = this.configService.get('CLOUDFRONT_KEY_PAIR_ID');
    
    // Load real private key from file - REQUIRED for CloudFront to work
    try {
      const keyPath = path.join(process.cwd(), 'keys', 'cloudfront-private-key.pem');
      this.privateKey = fs.readFileSync(keyPath, 'utf8');
      this.logger.log('✅ Successfully loaded CloudFront private key');
    } catch (error) {
      this.logger.error(`❌ Failed to load CloudFront private key: ${error.message}`);
      throw new Error('CloudFront private key is required. Please place your private key at keys/cloudfront-private-key.pem');
    }
  }

  async generateSignedUrl(s3Key: string, expirationMinutes: number = 10): Promise<{
    signedUrl: string;
    expiresAt: Date;
    generatedAt: Date;
  }> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expirationMinutes * 60 * 1000);

    try {
      const url = `${this.cloudFrontDomain}/${s3Key}`;
      
      const signedUrl = getSignedUrl({
        url: url,
        keyPairId: this.keyPairId,
        privateKey: this.privateKey,
        dateLessThan: expiresAt.toISOString(),
      });

      this.logger.log(`✅ Generated CloudFront signed URL for: ${s3Key}`);

      return {
        signedUrl,
        expiresAt,
        generatedAt: now,
      };

    } catch (error) {
      this.logger.error(`❌ Failed to generate signed URL: ${error.message}`);
      
      // Fallback to direct S3 URL if CloudFront fails
      const s3Bucket = this.configService.get('AWS_S3_BUCKET');
      const region = this.configService.get('AWS_REGION');
      const fallbackUrl = `https://${s3Bucket}.s3.${region}.amazonaws.com/${s3Key}`;
      
      this.logger.warn(`⚠️ Falling back to direct S3 URL: ${fallbackUrl}`);
      
      return {
        signedUrl: fallbackUrl,
        expiresAt,
        generatedAt: now,
      };
    }
  }

  async validateSignedUrl(signedUrl: string): Promise<boolean> {
    try {
      const url = new URL(signedUrl);
      const expires = url.searchParams.get('Expires');
      
      if (!expires) return false;
      
      const expirationTime = parseInt(expires) * 1000;
      const now = Date.now();
      
      return now < expirationTime;
    } catch (error) {
      this.logger.error(`URL validation failed: ${error.message}`);
      return false;
    }
  }
}