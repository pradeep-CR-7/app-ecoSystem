import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { App } from './entities/app.entity';
import { AppVersion, UploadStatus } from './entities/app-version.entity';
import { Developer } from '../developers/entities/developer.entity';
import { S3Service } from '../s3/s3.service';
import { SubmitAppDto } from './dto/submit-app.dto';

@Injectable()
export class AppsService {
  constructor(
    @InjectRepository(App)
    private appRepository: Repository<App>,
    @InjectRepository(AppVersion)
    private appVersionRepository: Repository<AppVersion>,
    private s3Service: S3Service,
    private dataSource: DataSource,
  ) {}

  async submitApp(
    submitAppDto: SubmitAppDto,
    file: Express.Multer.File,
    developer: Developer,
  ): Promise<any> {
    const { app_id, version_number } = submitAppDto;

    // Check if app exists
    let app = await this.appRepository.findOne({
      where: { app_id, developer_id: developer.developer_id }
    });

    // Check if version already exists
    const existingVersion = await this.appVersionRepository.findOne({
      where: { app_id, version_number }
    });

    if (existingVersion) {
      throw new ConflictException('Version already exists for this app');
    }

    // Validate file type
    const allowedTypes = ['.zip', '.apk', '.ipa'];
    const fileExtension = '.' + file.originalname.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      throw new BadRequestException('Invalid file type. Allowed: ZIP, APK, IPA');
    }

    // Start transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Upload to S3
      const uploadResult = await this.s3Service.uploadFile(
        file,
        developer.developer_id,
        app_id,
        version_number,
      );

      // Create or update app
      if (!app) {
        app = this.appRepository.create({
          app_id,
          developer_id: developer.developer_id,
          name: submitAppDto.name,
          description: submitAppDto.description,
          category: submitAppDto.category,
          tags: submitAppDto.tags ? submitAppDto.tags.split(',').map(t => t.trim()) : [],
          icon_url: submitAppDto.icon_url,
          screenshots: submitAppDto.screenshots ? JSON.parse(submitAppDto.screenshots) : [],
          website_url: submitAppDto.website_url,
          support_email: submitAppDto.support_email,
          is_published: false,
        });
        app = await queryRunner.manager.save(app);
      }

      // Mark previous version as not latest
      await queryRunner.manager.update(AppVersion, 
        { app_id, is_latest: true }, 
        { is_latest: false }
      );

      // Create new version
      const appVersion = this.appVersionRepository.create({
        app_id,
        developer_id: developer.developer_id,
        version_number,
        s3_file_url: uploadResult.url,
        s3_file_key: uploadResult.key,
        file_size_bytes: uploadResult.size,
        file_name: file.originalname,
        changelog: submitAppDto.changelog,
        is_latest: true,
        minimum_platform_version: submitAppDto.minimum_platform_version,
        supported_platforms: submitAppDto.supported_platforms ? JSON.parse(submitAppDto.supported_platforms) : [],
        upload_status: UploadStatus.COMPLETED,
      });

      const savedVersion = await queryRunner.manager.save(appVersion);

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'App submitted successfully',
        data: {
          app_id: app.app_id,
          name: app.name,
          version_number: savedVersion.version_number,
          developer_id: developer.developer_id,
          upload_status: savedVersion.upload_status,
          s3_file_url: savedVersion.s3_file_url,
          file_size_bytes: savedVersion.file_size_bytes,
          uploaded_at: savedVersion.uploaded_at,
          is_published: app.is_published,
        },
        meta: {
          request_id: `req_${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
