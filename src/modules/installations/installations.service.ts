import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { App } from '../apps/entities/app.entity';
import { AppVersion, UploadStatus } from '../apps/entities/app-version.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { MerchantAppInstallation, InstallationStatus } from '../merchants/entities/merchant-app-installation.entity';
import { Developer } from '../developers/entities/developer.entity';
import { CloudFrontService } from '../cloudfront/cloudfront.service';
import { InstallAppDto } from './dto/install-app.dto';
import { InstalledAppDto } from './dto/installed-apps.dto';

@Injectable()
export class InstallationsService {
  constructor(
    @InjectRepository(App)
    private appRepository: Repository<App>,
    @InjectRepository(AppVersion)
    private appVersionRepository: Repository<AppVersion>,
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
    @InjectRepository(MerchantAppInstallation)
    private installationRepository: Repository<MerchantAppInstallation>,
    @InjectRepository(Developer)
    private developerRepository: Repository<Developer>,
    private cloudFrontService: CloudFrontService,
    private dataSource: DataSource,
  ) {}

  async installApp(
    installAppDto: InstallAppDto,
    merchant: Merchant,
  ): Promise<any> {
    const { app_id, version_number } = installAppDto;

    // Check if app exists and is published
    const app = await this.appRepository.findOne({
      where: { 
        app_id, 
        is_published: true, 
        is_active: true 
      },
      relations: ['developer']
    });

    if (!app) {
      throw new NotFoundException('App not found or not available for installation');
    }

    // Check if app is already installed by this merchant
    const existingInstallation = await this.installationRepository.findOne({
      where: { merchant_id: merchant.merchant_id, app_id }
    });

    if (existingInstallation) {
      throw new ConflictException('App is already installed. Use update endpoint to change version.');
    }

    // Get the version to install (specific version or latest)
    let targetVersion: AppVersion;
    
    if (version_number) {
      targetVersion = await this.appVersionRepository.findOne({
        where: { app_id, version_number, upload_status: UploadStatus.COMPLETED }
      });
      
      if (!targetVersion) {
        throw new NotFoundException(`Version ${version_number} not found for this app`);
      }
    } else {
      targetVersion = await this.appVersionRepository.findOne({
        where: { app_id, is_latest: true, upload_status: UploadStatus.COMPLETED }
      });
      
      if (!targetVersion) {
        throw new NotFoundException('No completed versions available for this app');
      }
    }

    // Generate CloudFront signed URL
    const signedUrlData = await this.cloudFrontService.generateSignedUrl(
      targetVersion.s3_file_key,
      10 // 10 minutes expiration
    );

    // Start transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create installation record
      const installation = this.installationRepository.create({
        merchant_id: merchant.merchant_id,
        app_id,
        version_number: targetVersion.version_number,
        installation_status: InstallationStatus.INSTALLING,
        signed_url_generated_at: signedUrlData.generatedAt,
        signed_url_expires_at: signedUrlData.expiresAt,
      });

      const savedInstallation = await queryRunner.manager.save(installation);

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'App installation initiated successfully',
        data: {
          installation_id: savedInstallation.id,
          merchant_id: merchant.merchant_id,
          app_id: app.app_id,
          app_name: app.name,
          version_number: targetVersion.version_number,
          installation_status: savedInstallation.installation_status,
          download_url: signedUrlData.signedUrl,
          expires_at: signedUrlData.expiresAt.toISOString(),
          install_instructions: `Download the app using the provided URL. URL expires in 10 minutes.`,
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

  async getInstalledApps(merchantId: string): Promise<InstalledAppDto[]> {
    const installations = await this.installationRepository.find({
      where: { merchant_id: merchantId },
      relations: ['app', 'app.developer'],
      order: { installed_at: 'DESC' }
    });

    return installations.map(installation => ({
      installation_id: installation.id,
      app_id: installation.app_id,
      app_name: installation.app?.name || 'Unknown App',
      version_number: installation.version_number,
      installation_status: installation.installation_status,
      installed_at: installation.installed_at.toISOString(),
      updated_at: installation.updated_at.toISOString(),
      developer_name: installation.app?.developer?.company_name || installation.app?.developer?.name || 'Unknown Developer',
      category: installation.app?.category || 'Unknown',
    }));
  }

  async getInstallationDetails(installationId: number, merchantId: string): Promise<any> {
    const installation = await this.installationRepository.findOne({
      where: { id: installationId, merchant_id: merchantId },
      relations: ['app', 'app.developer']
    });

    if (!installation) {
      throw new NotFoundException('Installation not found');
    }

    // Check if signed URL is still valid and generate new one if needed
    let downloadUrl = null;
    let urlExpiresAt = null;

    // if (installation.signed_url_expires_at && installation.signed_url_expires_at > new Date()) {
      // Existing URL is still valid - regenerate for security
      const appVersion = await this.appVersionRepository.findOne({
        where: { app_id: installation.app_id, version_number: installation.version_number }
      });

      if (appVersion) {
        const signedUrlData = await this.cloudFrontService.generateSignedUrl(
          appVersion.s3_file_key,
          10
        );

        downloadUrl = signedUrlData.signedUrl;
        urlExpiresAt = signedUrlData.expiresAt.toISOString();

        // Update installation with new URL timestamps
        await this.installationRepository.update(
          { id: installationId },
          {
            signed_url_generated_at: signedUrlData.generatedAt,
            signed_url_expires_at: signedUrlData.expiresAt,
          }
        );
    //   }
    }

    return {
      success: true,
      message: 'Installation details retrieved successfully',
      data: {
        installation_id: installation.id,
        merchant_id: installation.merchant_id,
        app_id: installation.app_id,
        app_name: installation.app?.name,
        version_number: installation.version_number,
        installation_status: installation.installation_status,
        download_url: downloadUrl,
        url_expires_at: urlExpiresAt,
        installed_at: installation.installed_at.toISOString(),
        updated_at: installation.updated_at.toISOString(),
        app_details: {
          description: installation.app?.description,
          category: installation.app?.category,
          developer_name: installation.app?.developer?.company_name || installation.app?.developer?.name,
          website_url: installation.app?.website_url,
          support_email: installation.app?.support_email,
        }
      }
    };
  }

  async markInstallationComplete(installationId: number, merchantId: string): Promise<any> {
    const installation = await this.installationRepository.findOne({
      where: { id: installationId, merchant_id: merchantId }
    });

    if (!installation) {
      throw new NotFoundException('Installation not found');
    }

    await this.installationRepository.update(
      { id: installationId },
      { installation_status: InstallationStatus.INSTALLED }
    );

    return {
      success: true,
      message: 'Installation marked as complete',
      data: {
        installation_id: installationId,
        installation_status: InstallationStatus.INSTALLED,
      }
    };
  }
}