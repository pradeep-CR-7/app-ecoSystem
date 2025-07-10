import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppsModule } from './modules/apps/apps.module';
import { DevelopersModule } from './modules/developers/developers.module';
import { S3Module } from './modules/s3/s3.module';
import { StoreModule } from './modules/store/store.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { InstallationsModule } from './modules/installations/installations.module';
import { CloudFrontModule } from './modules/cloudfront/cloudfront.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST'),
        port: parseInt(configService.get('DB_PORT')),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false, // Auto-create tables from entities
        logging: true,
      }),
    }),
    // Fixed ThrottlerModule configuration for v5
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000,  // 1 minute in milliseconds
        limit: 10,   // 10 requests per minute
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour in milliseconds
        limit: 100,   // 100 requests per hour
      },
    ]),
    AppsModule,
    DevelopersModule,
    S3Module,
    StoreModule,
    MerchantsModule,
    InstallationsModule,
    CloudFrontModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}