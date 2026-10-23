import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../roles/role.entity';
import { Service } from '../services/service.entity';

/**
 * Permission accordee a un role sur un service (matrice role x service x action, CDC section 5.3).
 * Une ligne = une action autorisee sur un module ; `autorise = false` sert a tracer un refus explicite.
 */
@Entity({ name: 'role_permissions', schema: 'identite' })
@Index('UQ_role_permissions_role_service_action', ['roleId', 'serviceId', 'action'], { unique: true })
export class PermissionRole {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', generated: 'uuid' })
  uuid: string;

  @Index('IDX_role_permissions_role')
  @Column({ name: 'role_id', type: 'bigint' })
  roleId: string;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Index('IDX_role_permissions_service')
  @Column({ name: 'service_id', type: 'bigint' })
  serviceId: string;

  @ManyToOne(() => Service, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service: Service;

  /** Action metier du module (ex: "lire", "traiter", "valider"), stable et immuable. */
  @Column({ type: 'varchar', length: 64 })
  action: string;

  /** false = refus explicite (prioritaire sur un accord herite du role de plateforme). */
  @Column({ type: 'boolean', default: true })
  autorise: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
