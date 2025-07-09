import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { App } from '../../apps/entities/app.entity';
import { AppVersion } from '../../apps/entities/app-version.entity';

@Entity('developers')
export class Developer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  @Index()
  developer_id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 255, unique: true })
  @Index()
  email: string;

  @Column({ length: 255, nullable: true })
  company_name: string;

  @Column({ length: 500, nullable: true })
  website_url: string;

  @Column({ length: 20, nullable: true })
  contact_phone: string;

  @Column({ length: 500, nullable: true })
  profile_image_url: string;

  @Column({ length: 255, unique: true })
  @Index()
  api_key: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => App, app => app.developer)
  apps: App[];

  @OneToMany(() => AppVersion, version => version.developer)
  app_versions: AppVersion[];
}