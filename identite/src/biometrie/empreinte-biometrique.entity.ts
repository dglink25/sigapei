import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum StatutEmpreinte {
  ACTIVE = 'active',
  REVOQUEE = 'revoquee',
}

/** Ne stocke jamais de donnee biometrique brute : uniquement la cle publique WebAuthn. */
@Entity({ name: 'empreinte_biometrique', schema: 'identite' })
export class EmpreinteBiometrique {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ name: 'utilisateur_id', type: 'bigint' })
  utilisateurId: string;

  @Column({ name: 'appareil_id', type: 'bigint' })
  appareilId: string;

  @Column({ name: 'credential_id', type: 'varchar', length: 512, unique: true })
  credentialId: string;

  @Column({ name: 'cle_publique', type: 'text' })
  clePublique: string;

  @Column({ name: 'compteur_signature', type: 'bigint', default: 0 })
  compteurSignature: string;

  @Column({ type: 'enum', enum: StatutEmpreinte, default: StatutEmpreinte.ACTIVE })
  statut: StatutEmpreinte;

  @CreateDateColumn({ name: 'date_creation' })
  dateCreation: Date;
}
