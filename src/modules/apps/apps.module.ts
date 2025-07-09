import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppsController } from './apps.controller';
import { AppsService } from './apps.service';
import { App } from './entities/app.entity';
import { AppVersion } from './entities/app-version.entity';
import { Developer } from '../developers/entities/developer.entity';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([App, AppVersion, Developer]),
    S3Module,
  ],
  controllers: [AppsController],
  providers: [AppsService],
})
export class AppsModule {}