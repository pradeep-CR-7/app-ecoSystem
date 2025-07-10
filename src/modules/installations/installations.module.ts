import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstallationsController } from './installations.controller';
import { InstallationsService } from './installations.service';
import { App } from '../apps/entities/app.entity';
import { AppVersion } from '../apps/entities/app-version.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { MerchantAppInstallation } from '../merchants/entities/merchant-app-installation.entity';
import { Developer } from '../developers/entities/developer.entity';
import { CloudFrontModule } from '../cloudfront/cloudfront.module';
import { MerchantAuthGuard } from 'src/common/guards/merchant-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([App, AppVersion, Merchant, MerchantAppInstallation, Developer]),
    CloudFrontModule,
  ],
  controllers: [InstallationsController],
  providers: [InstallationsService, MerchantAuthGuard],
})
export class InstallationsModule {}