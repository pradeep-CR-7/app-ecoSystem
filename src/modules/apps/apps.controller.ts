import { 
  Controller, 
  Post, 
  Get,
  Put,
  Body, 
  Param,
  UseGuards, 
  UseInterceptors, 
  UploadedFile, 
  ParseFilePipe, 
  MaxFileSizeValidator, 
  FileTypeValidator 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentDeveloper } from '../../common/decorators/developer.decorator';
import { Developer } from '../developers/entities/developer.entity';
import { AppsService } from './apps.service';
import { SubmitAppDto } from './dto/submit-app.dto';
import { PublishAppDto } from './dto/publish-app.dto';
import { SubmitAppResponseDto } from './dto/submit-app-response.dto';
import { PublishAppResponseDto } from './dto/publish-app-response.dto';
import { AppStatusDto } from './dto/app-status.dto';

@ApiTags('Apps')
@Controller('api/v1/apps')
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  @Post('submit')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('build_file'))
  @ApiOperation({ summary: 'Submit an app build file' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @ApiResponse({ status: 201, description: 'App submitted successfully', type: SubmitAppResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 422, description: 'Validation failed' })
  async submitApp(
  @Body() submitAppDto: SubmitAppDto,
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 500 * 1024 * 1024 }), // 500MB
        new FileTypeValidator({ fileType: /(zip|apk|ipa)$/ }), // Fixed regex
      ],
    }),
  )
  file: Express.Multer.File,
  @CurrentDeveloper() developer: Developer,
): Promise<SubmitAppResponseDto> {
  return this.appsService.submitApp(submitAppDto, file, developer);
}

// Publish/Unpublish App
  @Put(':appId/publish')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Publish or unpublish an app' })
  @ApiParam({ name: 'appId', description: 'App ID', example: 'my-awesome-app' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'App publish status updated successfully', type: PublishAppResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - cannot publish app without versions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'App not found' })
  async publishApp(
    @Param('appId') appId: string,
    @Body() publishAppDto: PublishAppDto,
    @CurrentDeveloper() developer: Developer,
  ): Promise<PublishAppResponseDto> {
    return this.appsService.publishApp(appId, publishAppDto, developer);
  }

  // Get All Developer Apps with Status
  @Get('my-apps/status')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get all apps for developer with publishing status' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Apps with status retrieved successfully', type: [AppStatusDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyAppsWithStatus(@CurrentDeveloper() developer: Developer): Promise<AppStatusDto[]> {
    return this.appsService.getDeveloperAppsWithStatus(developer.developer_id);
  }

  // Get App Status
  @Get(':appId/status')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get app status and publishing information' })
  @ApiParam({ name: 'appId', description: 'App ID', example: 'my-awesome-app' })
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'App status retrieved successfully', type: AppStatusDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'App not found' })
  async getAppStatus(
    @Param('appId') appId: string,
    @CurrentDeveloper() developer: Developer,
  ): Promise<AppStatusDto> {
    return this.appsService.getAppStatus(appId, developer);
  }


}