import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Developer } from '../../modules/developers/entities/developer.entity';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @InjectRepository(Developer)
    private developerRepository: Repository<Developer>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const developerId = request.headers['x-developer-id'];

    if (!authHeader || !developerId) {
      throw new UnauthorizedException('Missing authentication headers');
    }

    const token = authHeader.replace('Bearer ', '');
    
    const developer = await this.developerRepository.findOne({
      where: { 
        api_key: token, 
        developer_id: developerId,
        is_active: true 
      }
    });

    if (!developer) {
      throw new UnauthorizedException('Invalid credentials or inactive developer');
    }

    request.developer = developer;
    return true;
  }
}