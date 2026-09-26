import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'appareil', schema: 'identite' })
export class Appareil {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', generated: 'uuid' })
  uuid: string;

  @Column({ name: 'utilisateur_id', type: 'bigint' })
  utilisateurId: string;

  /** Identifiant local persistant genere cote client (empreinte navigateur/app). */
  @Column({ name: 'identifiant_local', type: 'varchar', length: 255 })
  identifiantLocal: string;

  @Column({ name: 'nom_appareil', type: 'varchar', length: 255, nullable: true })
  nomAppareil: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  type: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  os: string | null;

  @Column({ name: 'fait_confiance', type: 'boolean', default: false })
  faitConfiance: boolean;

  @Column({ name: 'derniere_ip', type: 'varchar', length: 64, nullable: true })
  derniereIp: string | null;

  @UpdateDateColumn({ name: 'derniere_activite' })
  derniereActivite: Date;

  @CreateDateColumn({ name: 'date_creation' })
  dateCreation: Date;
}
