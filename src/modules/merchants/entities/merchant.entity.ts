import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { MerchantAppInstallation } from './merchant-app-installation.entity';

@Entity('merchants')
export class Merchant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  @Index()
  merchant_id: string;

  @Column({ length: 255 })
  business_name: string;

  @Column({ length: 255, nullable: true })
  contact_name: string;

  @Column({ length: 255, unique: true })
  @Index()
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 50, default: 'free' })
  @Index()
  subscription_plan: string;

  @Column({ length: 255, unique: true })
  @Index()
  api_key: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => MerchantAppInstallation, installation => installation.merchant)
  app_installations: MerchantAppInstallation[];
}