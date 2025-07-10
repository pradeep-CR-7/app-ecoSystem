import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { StoreService } from './store.service';
import { AppListQueryDto, SortBy, SortOrder } from './dto/app-list.dto';
import { AppListResponseDto } from './dto/app-list-response.dto';
import { AppDetailsResponseDto } from './dto/app-details-response.dto';

@ApiTags('Store')
@Controller('api/v1/store')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @Get('apps')
  @ApiOperation({ summary: 'Get all published apps with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10 })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name or description' })
  @ApiQuery({ name: 'developer', required: false, description: 'Filter by developer' })
  @ApiQuery({ name: 'sortBy', required: false, enum: SortBy, description: 'Sort by field' })
  @ApiQuery({ name: 'sortOrder', required: false, enum: SortOrder, description: 'Sort order' })
  @ApiResponse({ status: 200, description: 'Apps retrieved successfully', type: AppListResponseDto })
  async getAllApps(@Query() query: AppListQueryDto): Promise<AppListResponseDto> {
    return this.storeService.getAllApps(query);
  }

  @Get('apps/:appId')
  @ApiOperation({ summary: 'Get detailed information about a specific app' })
  @ApiParam({ name: 'appId', description: 'App ID', example: 'my-awesome-app' })
  @ApiResponse({ status: 200, description: 'App details retrieved successfully', type: AppDetailsResponseDto })
  @ApiResponse({ status: 404, description: 'App not found' })
  async getAppDetails(@Param('appId') appId: string): Promise<AppDetailsResponseDto> {
    return this.storeService.getAppDetails(appId);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all available app categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async getCategories() {
    return this.storeService.getCategories();
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured apps' })
  @ApiResponse({ status: 200, description: 'Featured apps retrieved successfully' })
  async getFeaturedApps() {
    const apps = await this.storeService.getFeaturedApps();
    return {
      success: true,
      message: 'Featured apps retrieved successfully',
      data: apps
    };
  }
}