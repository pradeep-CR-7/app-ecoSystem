import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index, JoinColumn, Unique } from 'typeorm';
import { App } from './app.entity';
import { Developer } from '../../developers/entities/developer.entity';

export enum UploadStatus {
  UPLOADING = 'uploading',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

@Entity('app_versions')
@Unique(['app_id', 'version_number'])
export class AppVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  @Index()
  app_id: string;

  @Column({ length: 50 })
  @Index()
  developer_id: string;

  @Column({ length: 50 })
  @Index()
  version_number: string;

  @Column({ length: 1000 })
  s3_file_url: string;

  @Column({ length: 500 })
  s3_file_key: string;

  @Column({ type: 'bigint', nullable: true })
  file_size_bytes: number;

  @Column({ length: 255, nullable: true })
  file_name: string;

  @Column({ type: 'text', nullable: true })
  changelog: string;

  @Column({ default: false })
  @Index()
  is_latest: boolean;

  @Column({ length: 50, nullable: true })
  minimum_platform_version: string;

  @Column({ type: 'json', nullable: true })
  supported_platforms: string[];

  @Column({ type: 'enum', enum: UploadStatus, default: UploadStatus.UPLOADING })
  @Index()
  upload_status: UploadStatus;

  @CreateDateColumn()
  uploaded_at: Date;

  @ManyToOne(() => App, app => app.versions)
  @JoinColumn({ name: 'app_id', referencedColumnName: 'app_id' })
  app: App;

  @ManyToOne(() => Developer, developer => developer.app_versions)
  @JoinColumn({ name: 'developer_id', referencedColumnName: 'developer_id' })
  developer: Developer;
}