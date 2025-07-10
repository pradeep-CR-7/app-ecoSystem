import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from '../../modules/merchants/entities/merchant.entity';

@Injectable()
export class MerchantAuthGuard implements CanActivate {
  constructor(
    @InjectRepository(Merchant)
    private merchantRepository: Repository<Merchant>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const merchantId = request.headers['x-merchant-id'];

    if (!authHeader || !merchantId) {
      throw new UnauthorizedException('Missing authentication headers');
    }

    const token = authHeader.replace('Bearer ', '');
    
    const merchant = await this.merchantRepository.findOne({
      where: { 
        api_key: token, 
        merchant_id: merchantId,
        is_active: true 
      }
    });

    if (!merchant) {
      throw new UnauthorizedException('Invalid credentials or inactive merchant');
    }

    request.merchant = merchant;
    return true;
  }
}