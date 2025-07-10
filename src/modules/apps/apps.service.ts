import { Injectable, ConflictException, BadRequestException,  NotFoundException, ForbiddenException  } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { App } from './entities/app.entity';
import { AppVersion, UploadStatus } from './entities/app-version.entity';
import { Developer } from '../developers/entities/developer.entity';
import { S3Service } from '../s3/s3.service';
import { SubmitAppDto } from './dto/submit-app.dto';
import { PublishAppDto } from './dto/publish-app.dto';
import { AppStatusDto } from './dto/app-status.dto';

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

    async publishApp(
    appId: string,
    publishAppDto: PublishAppDto,
    developer: Developer,
  ): Promise<any> {
    // Check if app exists and belongs to developer
    const app = await this.appRepository.findOne({
      where: { app_id: appId, developer_id: developer.developer_id }
    });

    if (!app) {
      throw new NotFoundException('App not found or you do not have permission to publish it');
    }

    // Check if app has at least one completed version
    const hasCompletedVersion = await this.appVersionRepository.findOne({
      where: { app_id: appId, upload_status: UploadStatus.COMPLETED }
    });

    if (!hasCompletedVersion && publishAppDto.is_published) {
      throw new BadRequestException('Cannot publish app without at least one completed version');
    }

    // Get latest version info
    const latestVersion = await this.appVersionRepository.findOne({
      where: { app_id: appId, is_latest: true }
    });

    // Update app publish status
    const updateData: any = {
      is_published: publishAppDto.is_published,
      updated_at: new Date(),
    };

    // Set published_at timestamp when publishing
    if (publishAppDto.is_published && !app.is_published) {
      updateData.published_at = new Date();
    }

    // Clear published_at when unpublishing
    if (!publishAppDto.is_published && app.is_published) {
      updateData.published_at = null;
    }

    await this.appRepository.update(
      { app_id: appId },
      updateData
    );

    const action = publishAppDto.is_published ? 'published' : 'unpublished';
    
    return {
      success: true,
      message: `App ${action} successfully`,
      data: {
        app_id: app.app_id,
        name: app.name,
        developer_id: developer.developer_id,
        is_published: publishAppDto.is_published,
        published_at: updateData.published_at?.toISOString() || null,
        latest_version: latestVersion?.version_number || 'No versions',
        publishing_notes: publishAppDto.publishing_notes,
      },
      meta: {
        request_id: `req_${Date.now()}`,
        timestamp: new Date().toISOString(),
      },
    };
  }

   // NEW METHOD: Get App Status (for developer)
  async getAppStatus(appId: string, developer: Developer): Promise<AppStatusDto> {
    const app = await this.appRepository.findOne({
      where: { app_id: appId, developer_id: developer.developer_id }
    });

    if (!app) {
      throw new NotFoundException('App not found');
    }

    // Get latest version and version count
    const [latestVersion, versionCount] = await Promise.all([
      this.appVersionRepository.findOne({
        where: { app_id: appId, is_latest: true }
      }),
      this.appVersionRepository.count({
        where: { app_id: appId }
      })
    ]);

    return {
      app_id: app.app_id,
      name: app.name,
      developer_id: app.developer_id,
      is_published: app.is_published,
      is_active: app.is_active,
      latest_version: latestVersion?.version_number || 'No versions',
      version_count: versionCount,
      published_at: app.published_at?.toISOString() || null,
      created_at: app.created_at.toISOString(),
      updated_at: app.updated_at.toISOString(),
    };
  }

  // NEW METHOD: Get All Developer Apps with Status
  async getDeveloperAppsWithStatus(developerId: string): Promise<AppStatusDto[]> {
    const apps = await this.appRepository.find({
      where: { developer_id: developerId },
      order: { updated_at: 'DESC' }
    });

    const appsWithStatus = await Promise.all(
      apps.map(async (app) => {
        const [latestVersion, versionCount] = await Promise.all([
          this.appVersionRepository.findOne({
            where: { app_id: app.app_id, is_latest: true }
          }),
          this.appVersionRepository.count({
            where: { app_id: app.app_id }
          })
        ]);

        return {
          app_id: app.app_id,
          name: app.name,
          developer_id: app.developer_id,
          is_published: app.is_published,
          is_active: app.is_active,
          latest_version: latestVersion?.version_number || 'No versions',
          version_count: versionCount,
          published_at: app.published_at?.toISOString() || null,
          created_at: app.created_at.toISOString(),
          updated_at: app.updated_at.toISOString(),
        };
      })
    );

    return appsWithStatus;
  }

}
