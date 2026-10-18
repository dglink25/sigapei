import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Service, StatutService } from '../services/service.entity';

/**
 * Assignation d'un service a un etablissement. La cle etrangere vers "etablissements"."etablissements"
 * (ON DELETE CASCADE) existe cote base de donnees ; elle n'est pas modelisee ici (schema d'un autre microservice).
 */
@Entity({ name: 'etablissement_services', schema: 'identite' })
export class EtablissementService {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', generated: 'uuid' })
  uuid: string;

  @Column({ name: 'service_id', type: 'bigint' })
  serviceId: string;

  @ManyToOne(() => Service, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service: Service;

  @Column({ name: 'etablissement_id', type: 'bigint' })
  etablissementId: string;

  @Column({ type: 'enum', enum: StatutService, enumName: 'identite_status_service_enum', default: StatutService.ACTIVE })
  status: StatutService;

  /** Motif du blocage (renseigne quand status = inactive). */
  @Column({ type: 'varchar', length: 255, nullable: true })
  motif: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
