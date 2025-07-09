import { 
  Controller, 
  Post, 
  Body, 
  UseGuards, 
  UseInterceptors, 
  UploadedFile, 
  ParseFilePipe, 
  MaxFileSizeValidator, 
  FileTypeValidator 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentDeveloper } from '../../common/decorators/developer.decorator';
import { Developer } from '../developers/entities/developer.entity';
import { AppsService } from './apps.service';
import { SubmitAppDto } from './dto/submit-app.dto';
import { SubmitAppResponseDto } from './dto/submit-app-response.dto';

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
}