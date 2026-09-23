import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from '../roles/role.entity';

export enum StatutUtilisateur {
  ACTIF = 'actif',
  BLOQUE = 'bloque',
  ARCHIVE = 'archive',
}

@Entity({ name: 'utilisateur', schema: 'identite' })
@Index(['telephone'], { unique: true, where: '"telephone" IS NOT NULL' })
@Index(['email'], { unique: true, where: '"email" IS NOT NULL' })
export class Utilisateur {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', generated: 'uuid' })
  uuid: string;

  /** Nul uniquement pour le super administrateur (rattache a la plateforme, pas a un etablissement). */
  @Column({ type: 'uuid', nullable: true })
  tenantId: string | null;

  @ManyToOne(() => Role, (role) => role.utilisateurs, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ name: 'role_id', type: 'bigint' })
  roleId: string;

  @Column({ name: 'nom_complet', type: 'varchar', length: 255 })
  nomComplet: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telephone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  matricule: string | null;

  @Column({ name: 'pays_telephone', type: 'varchar', length: 2, nullable: true })
  paysTelephone: string | null;

  @Column({ type: 'enum', enum: StatutUtilisateur, default: StatutUtilisateur.ACTIF })
  statut: StatutUtilisateur;

  @Column({ name: 'photo_url', type: 'varchar', length: 512, nullable: true })
  photoUrl: string | null;

  /** Identifiants externes optionnels (Google / GitHub via Firebase), pour tracer le lien. */
  @Column({ name: 'firebase_uid_google', type: 'varchar', length: 128, nullable: true })
  firebaseUidGoogle: string | null;

  @Column({ name: 'firebase_uid_github', type: 'varchar', length: 128, nullable: true })
  firebaseUidGithub: string | null;

  @CreateDateColumn({ name: 'date_creation' })
  dateCreation: Date;
}
