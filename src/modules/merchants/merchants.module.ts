import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Merchant } from './entities/merchant.entity';
import { MerchantAppInstallation } from './entities/merchant-app-installation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Merchant, MerchantAppInstallation])],
  exports: [TypeOrmModule],
})
export class MerchantsModule {}