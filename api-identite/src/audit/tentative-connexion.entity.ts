import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum MethodeConnexion {
  TELEPHONE_OTP = 'telephone_otp',
  EMAIL_OTP = 'email_otp',
  MATRICULE_EMPREINTE = 'matricule_empreinte',
  GOOGLE = 'google',
  GITHUB = 'github',
}

export enum StatutTentative {
  SUCCES = 'succes',
  ECHEC = 'echec',
}

/** Journal d'audit immuable : 100% des tentatives de connexion, reussies ou non. */
@Entity({ name: 'tentative_connexion', schema: 'identite' })
export class TentativeConnexion {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ name: 'utilisateur_id', type: 'bigint', nullable: true })
  utilisateurId: string | null;

  @Column({ type: 'enum', enum: MethodeConnexion })
  methode: MethodeConnexion;

  @Column({ type: 'enum', enum: StatutTentative })
  statut: StatutTentative;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @Column({ name: 'motif_echec', type: 'varchar', length: 255, nullable: true })
  motifEchec: string | null;

  @CreateDateColumn({ name: 'cree_le' })
  creeLe: Date;
}
