import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, Index, JoinColumn } from 'typeorm';
import { Developer } from '../../developers/entities/developer.entity';
import { AppVersion } from './app-version.entity';

@Entity('apps')
export class App {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, unique: true })
  @Index()
  app_id: string;

  @Column({ length: 50 })
  @Index()
  developer_id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 100, nullable: true })
  @Index()
  category: string;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ length: 500, nullable: true })
  icon_url: string;

  @Column({ type: 'json', nullable: true })
  screenshots: string[];

  @Column({ length: 500, nullable: true })
  website_url: string;

  @Column({ length: 255, nullable: true })
  support_email: string;

  @Column({ length: 500, nullable: true })
  privacy_policy_url: string;

  @Column({ length: 500, nullable: true })
  terms_of_service_url: string;

  @Column({ default: false })
  @Index()
  is_published: boolean;

  @Column({ default: true })
  @Index()
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Developer, developer => developer.apps)
  @JoinColumn({ name: 'developer_id', referencedColumnName: 'developer_id' })
  developer: Developer;

  @OneToMany(() => AppVersion, version => version.app)
  versions: AppVersion[];
}