import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { App } from '../apps/entities/app.entity';
import { AppVersion } from '../apps/entities/app-version.entity';
import { Developer } from '../developers/entities/developer.entity';
import { AppListQueryDto } from './dto/app-list.dto';
import { AppListResponseDto, AppListItemDto } from './dto/app-list-response.dto';
import { AppDetailsResponseDto } from './dto/app-details-response.dto';

@Injectable()
export class StoreService {
  constructor(
    @InjectRepository(App)
    private appRepository: Repository<App>,
    @InjectRepository(AppVersion)
    private appVersionRepository: Repository<AppVersion>,
    @InjectRepository(Developer)
    private developerRepository: Repository<Developer>,
  ) {}

  async getAllApps(query: AppListQueryDto): Promise<AppListResponseDto> {
    const { page, limit, category, search, developer, sortBy, sortOrder } = query;
    
    const queryBuilder = this.appRepository
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.developer', 'developer')
      .where('app.is_published = :published', { published: true })
      .andWhere('app.is_active = :active', { active: true });

    // Apply filters
    if (category) {
      queryBuilder.andWhere('app.category = :category', { category });
    }

    if (search) {
      queryBuilder.andWhere(
        '(app.name LIKE :search OR app.description LIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (developer) {
      queryBuilder.andWhere('developer.developer_id = :developer', { developer });
    }

    // Apply sorting
    queryBuilder.orderBy(`app.${sortBy}`, sortOrder);

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [apps, total] = await queryBuilder.getManyAndCount();

    // Get latest versions for each app
    const appsWithVersions = await Promise.all(
      apps.map(async (app) => {
        const latestVersion = await this.appVersionRepository.findOne({
          where: { app_id: app.app_id, is_latest: true }
        });

        return {
          app_id: app.app_id,
          name: app.name,
          description: app.description,
          category: app.category,
          tags: app.tags || [],
          icon_url: app.icon_url,
          screenshots: app.screenshots || [],
          developer_id: app.developer_id,
          developer_name: app.developer?.company_name || app.developer?.name,
          latest_version: latestVersion?.version_number || 'No versions',
          updated_at: app.updated_at.toISOString(),
          is_published: app.is_published,
        };
      })
    );

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      success: true,
      message: 'Apps retrieved successfully',
      data: appsWithVersions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
      filters: {
        category: category || null,
        search: search || null,
        developer: developer || null,
      },
    };
  }

  async getAppDetails(appId: string): Promise<AppDetailsResponseDto> {
    const app = await this.appRepository.findOne({
      where: { 
        app_id: appId, 
        is_published: true, 
        is_active: true 
      },
      relations: ['developer']
    });

    if (!app) {
      throw new NotFoundException('App not found or not available');
    }

    // Get all versions
    const versions = await this.appVersionRepository.find({
      where: { app_id: appId },
      order: { uploaded_at: 'DESC' }
    });

    // Get latest version
    const latestVersion = versions.find(v => v.is_latest);

    // Count total versions
    const versionCount = versions.length;

    return {
      success: true,
      message: 'App details retrieved successfully',
      data: {
        app_id: app.app_id,
        name: app.name,
        description: app.description,
        category: app.category,
        tags: app.tags || [],
        icon_url: app.icon_url,
        screenshots: app.screenshots || [],
        website_url: app.website_url,
        support_email: app.support_email,
        privacy_policy_url: app.privacy_policy_url,
        terms_of_service_url: app.terms_of_service_url,
        is_published: app.is_published,
        is_active: app.is_active,
        created_at: app.created_at.toISOString(),
        updated_at: app.updated_at.toISOString(),
        latest_version: latestVersion?.version_number || 'No versions',
        version_count: versionCount,
        developer: {
          developer_id: app.developer.developer_id,
          name: app.developer.name,
          company_name: app.developer.company_name,
          website_url: app.developer.website_url,
          email: app.developer.email,
        },
        versions: versions.map(v => ({
          version_number: v.version_number,
          changelog: v.changelog,
          uploaded_at: v.uploaded_at.toISOString(),
          is_latest: v.is_latest,
          upload_status: v.upload_status,
          file_size_bytes: v.file_size_bytes,
        }))
      }
    };
  }

  async getCategories(): Promise<{ categories: string[] }> {
    const categories = await this.appRepository
      .createQueryBuilder('app')
      .select('DISTINCT app.category', 'category')
      .where('app.is_published = :published', { published: true })
      .andWhere('app.is_active = :active', { active: true })
      .andWhere('app.category IS NOT NULL')
      .getRawMany();

    return {
      categories: categories.map(c => c.category).sort()
    };
  }

  async getFeaturedApps(): Promise<AppListItemDto[]> {
    const apps = await this.appRepository.find({
      where: { 
        is_published: true, 
        is_active: true 
      },
      relations: ['developer'],
      order: { updated_at: 'DESC' },
      take: 6 // Featured apps limit
    });

    const appsWithVersions = await Promise.all(
      apps.map(async (app) => {
        const latestVersion = await this.appVersionRepository.findOne({
          where: { app_id: app.app_id, is_latest: true }
        });

        return {
          app_id: app.app_id,
          name: app.name,
          description: app.description,
          category: app.category,
          tags: app.tags || [],
          icon_url: app.icon_url,
          screenshots: app.screenshots || [],
          developer_id: app.developer_id,
          developer_name: app.developer?.company_name || app.developer?.name,
          latest_version: latestVersion?.version_number || 'No versions',
          updated_at: app.updated_at.toISOString(),
          is_published: app.is_published,
        };
      })
    );

    return appsWithVersions;
  }
}