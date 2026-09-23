import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Utilisateur } from '../utilisateurs/utilisateur.entity';

/** Les 3 parcours de connexion definis par la matrice section 2.1 du cahier des charges. */
export enum FamilleAuth {
  PARENT_APPRENANT = 'parent_apprenant',
  PERSONNEL_ADMIN = 'personnel_admin',
  SUPER_ADMIN = 'super_admin',
}

export const ROLES_SYSTEME = [
  'super_admin',
  'administrateur',
  'personnel',
  'enseignant',
  'apprenant',
  'parent',
] as const;

@Entity({ name: 'role', schema: 'identite' })
export class Role {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', generated: 'uuid' })
  uuid: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  code: string;

  @Column({ type: 'varchar', length: 128 })
  libelle: string;

  @Column({ type: 'enum', enum: FamilleAuth, default: FamilleAuth.PERSONNEL_ADMIN })
  familleAuth: FamilleAuth;

  @Column({ type: 'boolean', default: false })
  estPersonnalise: boolean;

  /** Nul pour les roles globaux (crees par le super administrateur). */
  @Column({ type: 'uuid', nullable: true })
  tenantId: string | null;

  @CreateDateColumn({ name: 'date_creation' })
  dateCreation: Date;

  @OneToMany(() => Utilisateur, (u) => u.role)
  utilisateurs: Utilisateur[];
}
