import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { App } from '../apps/entities/app.entity';
import { AppVersion } from '../apps/entities/app-version.entity';
import { Developer } from '../developers/entities/developer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([App, AppVersion, Developer])],
  controllers: [StoreController],
  providers: [StoreService],
})
export class StoreModule {}