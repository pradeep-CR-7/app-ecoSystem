import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index, JoinColumn, Unique } from 'typeorm';
import { Merchant } from './merchant.entity';
import { App } from '../../apps/entities/app.entity';

export enum InstallationStatus {
  INSTALLING = 'installing',
  INSTALLED = 'installed',
  FAILED = 'failed',
  UPDATING = 'updating',
  UNINSTALLED = 'uninstalled'
}

@Entity('merchant_app_installations')
@Unique(['merchant_id', 'app_id'])
export class MerchantAppInstallation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  @Index()
  merchant_id: string;

  @Column({ length: 100 })
  @Index()
  app_id: string;

  @Column({ length: 50 })
  version_number: string;

  @Column({ length: 50, default: InstallationStatus.INSTALLING })
  @Index()
  installation_status: InstallationStatus;

  @Column({ type: 'timestamp', nullable: true })
  signed_url_generated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  signed_url_expires_at: Date;

  @CreateDateColumn()
  installed_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  uninstalled_at: Date;

  @ManyToOne(() => Merchant, merchant => merchant.app_installations)
  @JoinColumn({ name: 'merchant_id', referencedColumnName: 'merchant_id' })
  merchant: Merchant;

  @ManyToOne(() => App)
  @JoinColumn({ name: 'app_id', referencedColumnName: 'app_id' })
  app: App;
}
