import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum StatutService {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/** Catalogue des services de la plateforme (gere par le super administrateur). */
@Entity({ name: 'services', schema: 'identite' })
export class Service {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', generated: 'uuid' })
  uuid: string;

  /** Code stable et immuable (ex: "scolarite"), utilise par les autres microservices pour tester un acces. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  nom: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: StatutService, enumName: 'identite_status_service_enum', default: StatutService.ACTIVE })
  status: StatutService;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
