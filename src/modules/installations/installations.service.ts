import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Not } from 'typeorm';
import { App } from '../apps/entities/app.entity';
import { AppVersion, UploadStatus } from '../apps/entities/app-version.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { MerchantAppInstallation, InstallationStatus } from '../merchants/entities/merchant-app-installation.entity';
import { Developer } from '../developers/entities/developer.entity';
import { CloudFrontService } from '../cloudfront/cloudfront.service';
import { InstallAppDto } from './dto/install-app.dto';
import { InstalledAppDto } from './dto/installed-apps.dto';
import { DeleteAppDto } from './dto/delete-app.dto';


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

  /**
   * Helper method to compare semantic versions
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.replace(/^v/, '').split('.').map(Number);
    const v2Parts = version2.replace(/^v/, '').split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }

  /**
   * Check if there's an update available for the installed app
   */
  private async checkForUpdates(appId: string, currentVersion: string): Promise<boolean> {
    const latestVersion = await this.appVersionRepository.findOne({
      where: { 
        app_id: appId, 
        is_latest: true, 
        upload_status: UploadStatus.COMPLETED 
      }
    });

    if (!latestVersion) return false;

    // Compare versions - return true if latest is newer than current
    return this.compareVersions(latestVersion.version_number, currentVersion) > 0;
  }

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

    // Check for ANY existing installation (including uninstalled)
    const existingInstallation = await this.installationRepository.findOne({
      where: { 
        merchant_id: merchant.merchant_id, 
        app_id
      }
    });

    // If there's an active installation, throw conflict
    if (existingInstallation && existingInstallation.installation_status !== InstallationStatus.UNINSTALLED) {
      throw new ConflictException('App is already installed. Use update endpoint to change version.');
    }

    // ALWAYS get the latest version (ignore version_number parameter for now)
    // You can modify this logic if you want to allow specific version installation
    const latestVersion = await this.appVersionRepository.findOne({
      where: { 
        app_id, 
        is_latest: true, 
        upload_status: UploadStatus.COMPLETED 
      }
    });

    if (!latestVersion) {
      throw new NotFoundException('No completed versions available for this app');
    }

    // Generate CloudFront signed URL for the latest version
    const signedUrlData = await this.cloudFrontService.generateSignedUrl(
      latestVersion.s3_file_key,
      10 // 10 minutes expiration
    );

    // Start transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let savedInstallation: MerchantAppInstallation;

      if (existingInstallation && existingInstallation.installation_status === InstallationStatus.UNINSTALLED) {
        // Reactivate existing uninstalled record with latest version
        const now = new Date();
        await queryRunner.manager.update(
          MerchantAppInstallation,
          { id: existingInstallation.id },
          {
            version_number: latestVersion.version_number, // Always use latest
            installation_status: InstallationStatus.INSTALLING,
            signed_url_generated_at: signedUrlData.generatedAt,
            signed_url_expires_at: signedUrlData.expiresAt,
            installed_at: now,
            updated_at: now,
            uninstalled_at: null,
          }
        );
        
        savedInstallation = await queryRunner.manager.findOne(MerchantAppInstallation, {
          where: { id: existingInstallation.id }
        });
      } else {
        // Create new installation record with latest version
        const installation = this.installationRepository.create({
          merchant_id: merchant.merchant_id,
          app_id,
          version_number: latestVersion.version_number, // Always use latest
          installation_status: InstallationStatus.INSTALLING,
          signed_url_generated_at: signedUrlData.generatedAt,
          signed_url_expires_at: signedUrlData.expiresAt,
        });

        savedInstallation = await queryRunner.manager.save(installation);
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: existingInstallation ? 'App reinstallation initiated successfully' : 'App installation initiated successfully',
        data: {
          installation_id: savedInstallation.id,
          merchant_id: merchant.merchant_id,
          app_id: app.app_id,
          app_name: app.name,
          version_number: latestVersion.version_number, // Latest version
          installation_status: savedInstallation.installation_status,
          download_url: signedUrlData.signedUrl,
          expires_at: signedUrlData.expiresAt.toISOString(),
          install_instructions: `Download the latest version (${latestVersion.version_number}) using the provided URL. URL expires in 10 minutes.`,
          is_reinstall: !!existingInstallation,
          is_latest_version: true, // Always true since we always install latest
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
      where: { 
        merchant_id: merchantId,
        installation_status: InstallationStatus.INSTALLED 
      },
      relations: ['app', 'app.developer'],
      order: { installed_at: 'DESC' }
    });

    // Use Promise.all to check updates for all apps concurrently
    const appsWithUpdateInfo = await Promise.all(
      installations.map(async (installation) => {
        const isUpdateAvailable = await this.checkForUpdates(
          installation.app_id, 
          installation.version_number
        );

        return {
          installation_id: installation.id,
          app_id: installation.app_id,
          app_name: installation.app?.name || 'Unknown App',
          version_number: installation.version_number,
          installation_status: installation.installation_status,
          installed_at: installation.installed_at.toISOString(),
          updated_at: installation.updated_at.toISOString(),
          developer_name: installation.app?.developer?.company_name || installation.app?.developer?.name || 'Unknown Developer',
          category: installation.app?.category || 'Unknown',
          isUpdateAvailable, // New field indicating if update is available
        };
      })
    );

    return appsWithUpdateInfo;
  }

  async getInstallationDetails(installationId: number, merchantId: string): Promise<any> {
    const installation = await this.installationRepository.findOne({
      where: { id: installationId, merchant_id: merchantId },
      relations: ['app', 'app.developer']
    });

    if (!installation) {
      throw new NotFoundException('Installation not found');
    }

    // Check for updates
    const isUpdateAvailable = await this.checkForUpdates(
      installation.app_id, 
      installation.version_number
    );

    // Get latest version info
    const latestVersion = await this.appVersionRepository.findOne({
      where: { 
        app_id: installation.app_id, 
        is_latest: true, 
        upload_status: UploadStatus.COMPLETED 
      }
    });

    // Generate fresh signed URL for current installed version
    const currentAppVersion = await this.appVersionRepository.findOne({
      where: { app_id: installation.app_id, version_number: installation.version_number }
    });

    let downloadUrl = null;
    let urlExpiresAt = null;

    if (currentAppVersion) {
      const signedUrlData = await this.cloudFrontService.generateSignedUrl(
        currentAppVersion.s3_file_key,
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
        isUpdateAvailable, // Update availability flag
        latest_version: latestVersion?.version_number || installation.version_number,
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

  async deleteApp(
    deleteAppDto: DeleteAppDto,
    merchant: Merchant,
  ): Promise<any> {
    const { app_id } = deleteAppDto;

    const installation = await this.installationRepository.findOne({
      where: { 
        merchant_id: merchant.merchant_id, 
        app_id,
        installation_status: InstallationStatus.INSTALLED 
      },
      relations: ['app']
    });

    if (!installation) {
      throw new NotFoundException('App is not installed or not found');
    }

    if (installation.installation_status === InstallationStatus.UNINSTALLED) {
      throw new ConflictException('App is already uninstalled');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const now = new Date();
      const previousStatus = installation.installation_status;

      await queryRunner.manager.update(
        MerchantAppInstallation,
        { id: installation.id },
        {
          installation_status: InstallationStatus.UNINSTALLED,
          uninstalled_at: now,
          updated_at: now,
        }
      );

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'App uninstalled successfully',
        data: {
          installation_id: installation.id,
          merchant_id: merchant.merchant_id,
          app_id: installation.app_id,
          app_name: installation.app?.name || 'Unknown App',
          previous_status: previousStatus,
          uninstalled_at: now.toISOString(),
        },
        meta: {
          request_id: `req_${Date.now()}`,
          timestamp: now.toISOString(),
        },
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getAllMerchantApps(merchantId: string): Promise<any[]> {
    const installations = await this.installationRepository.find({
      where: { merchant_id: merchantId },
      relations: ['app', 'app.developer'],
      order: { updated_at: 'DESC' }
    });

    // Check for updates on all apps (including uninstalled ones)
    const appsWithUpdateInfo = await Promise.all(
      installations.map(async (installation) => {
        let isUpdateAvailable = false;
        
        // Only check for updates if app is currently installed
        if (installation.installation_status === InstallationStatus.INSTALLED) {
          isUpdateAvailable = await this.checkForUpdates(
            installation.app_id, 
            installation.version_number
          );
        }

        return {
          installation_id: installation.id,
          app_id: installation.app_id,
          app_name: installation.app?.name || 'Unknown App',
          version_number: installation.version_number,
          installation_status: installation.installation_status,
          installed_at: installation.installed_at.toISOString(),
          updated_at: installation.updated_at.toISOString(),
          uninstalled_at: installation.uninstalled_at?.toISOString() || null,
          developer_name: installation.app?.developer?.company_name || installation.app?.developer?.name || 'Unknown Developer',
          category: installation.app?.category || 'Unknown',
          isUpdateAvailable, // Update availability flag
        };
      })
    );

    return appsWithUpdateInfo;
  }

  /**
   * NEW METHOD: Update app to latest version
   */
  async updateApp(appId: string, merchantId: string): Promise<any> {
    const installation = await this.installationRepository.findOne({
      where: { 
        merchant_id: merchantId, 
        app_id: appId,
        installation_status: InstallationStatus.INSTALLED 
      },
      relations: ['app']
    });

    if (!installation) {
      throw new NotFoundException('App is not installed');
    }

    // Get latest version
    const latestVersion = await this.appVersionRepository.findOne({
      where: { 
        app_id: appId, 
        is_latest: true, 
        upload_status: UploadStatus.COMPLETED 
      }
    });

    if (!latestVersion) {
      throw new NotFoundException('No latest version available');
    }

    // Check if already on latest version
    if (installation.version_number === latestVersion.version_number) {
      throw new ConflictException('App is already on the latest version');
    }

    // Generate signed URL for latest version
    const signedUrlData = await this.cloudFrontService.generateSignedUrl(
      latestVersion.s3_file_key,
      10
    );

    // Update installation record
    await this.installationRepository.update(
      { id: installation.id },
      {
        version_number: latestVersion.version_number,
        installation_status: InstallationStatus.UPDATING,
        signed_url_generated_at: signedUrlData.generatedAt,
        signed_url_expires_at: signedUrlData.expiresAt,
        updated_at: new Date(),
      }
    );

    return {
      success: true,
      message: 'App update initiated successfully',
      data: {
        installation_id: installation.id,
        app_id: appId,
        app_name: installation.app?.name,
        previous_version: installation.version_number,
        new_version: latestVersion.version_number,
        installation_status: InstallationStatus.UPDATING,
        download_url: signedUrlData.signedUrl,
        expires_at: signedUrlData.expiresAt.toISOString(),
        update_instructions: `Download the updated version (${latestVersion.version_number}) using the provided URL. URL expires in 10 minutes.`,
      },
      meta: {
        request_id: `req_${Date.now()}`,
        timestamp: new Date().toISOString(),
      },
    };
  }
}