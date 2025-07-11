import { Controller, Post, Get, Put, Body, Param, UseGuards, ParseIntPipe, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { MerchantAuthGuard } from '../../common/guards/merchant-auth.guard'; 
import { Merchant } from '../merchants/entities/merchant.entity';
import { InstallationsService } from './installations.service';
import { InstallAppDto } from './dto/install-app.dto';
import { InstallAppResponseDto } from './dto/install-app-response.dto';
import { InstalledAppDto } from './dto/installed-apps.dto';
import { CurrentMerchant } from 'src/common/decorators/merchant.decorator';
import { DeleteAppDto } from './dto/delete-app.dto';
import { DeleteAppResponseDto } from './dto/delete-app-response.dto';

@ApiTags('Installations')
@Controller('api/v1/installations')
export class InstallationsController {
  constructor(private readonly installationsService: InstallationsService) {}

  @Post('install')
  @UseGuards(MerchantAuthGuard)
  @ApiOperation({ summary: 'Install an app for merchant' })
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'App installation initiated successfully', type: InstallAppResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'App not found' })
  @ApiResponse({ status: 409, description: 'App already installed' })
  async installApp(
    @Body() installAppDto: InstallAppDto,
    @CurrentMerchant() merchant: Merchant,
  ): Promise<InstallAppResponseDto> {
    return this.installationsService.installApp(installAppDto, merchant);
  }

  @Get('my-apps')
  @UseGuards(MerchantAuthGuard)
  @ApiOperation({ summary: 'Get all installed apps for merchant' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Installed apps retrieved successfully', type: [InstalledAppDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getInstalledApps(@CurrentMerchant() merchant: Merchant): Promise<InstalledAppDto[]> {
    return this.installationsService.getInstalledApps(merchant.merchant_id);
  }

  // Get all merchant apps (including uninstalled)
  @Get('all-apps')
  @UseGuards(MerchantAuthGuard)
  @ApiOperation({ summary: 'Get all apps for merchant including uninstalled (for admin/audit)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'All apps retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAllMerchantApps(@CurrentMerchant() merchant: Merchant) {
    const apps = await this.installationsService.getAllMerchantApps(merchant.merchant_id);
    return {
      success: true,
      message: 'All merchant apps retrieved successfully',
      data: apps
    };
  }

  @Get(':installationId')
  @UseGuards(MerchantAuthGuard)
  @ApiOperation({ summary: 'Get installation details with fresh download URL' })
  @ApiParam({ name: 'installationId', description: 'Installation ID' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Installation details retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Installation not found' })
  async getInstallationDetails(
    @Param('installationId', ParseIntPipe) installationId: number,
    @CurrentMerchant() merchant: Merchant,
  ) {
    return this.installationsService.getInstallationDetails(installationId, merchant.merchant_id);
  }

  @Put(':installationId/complete')
  @UseGuards(MerchantAuthGuard)
  @ApiOperation({ summary: 'Mark installation as complete' })
  @ApiParam({ name: 'installationId', description: 'Installation ID' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Installation marked as complete' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Installation not found' })
  async markInstallationComplete(
    @Param('installationId', ParseIntPipe) installationId: number,
    @CurrentMerchant() merchant: Merchant,
  ) {
    return this.installationsService.markInstallationComplete(installationId, merchant.merchant_id);
  }

  // Delete/Uninstall App
  @Delete('uninstall')
  @UseGuards(MerchantAuthGuard)
  @ApiOperation({ summary: 'Uninstall an app for merchant (soft delete)' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'App uninstalled successfully', type: DeleteAppResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'App not installed or not found' })
  @ApiResponse({ status: 409, description: 'App already uninstalled' })
  async deleteApp(
    @Body() deleteAppDto: DeleteAppDto,
    @CurrentMerchant() merchant: Merchant,
  ): Promise<DeleteAppResponseDto> {
    return this.installationsService.deleteApp(deleteAppDto, merchant);
  }

  
}