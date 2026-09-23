import { Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Utilisateur } from './utilisateur.entity';

export enum TypeIdentifiant {
  EMAIL = 'email',
  TELEPHONE = 'telephone',
}

@Entity({ name: 'identifiant_recuperation', schema: 'identite' })
export class IdentifiantRecuperation {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: Utilisateur;

  @Column({ name: 'utilisateur_id', type: 'bigint' })
  utilisateurId: string;

  @Column({ type: 'enum', enum: TypeIdentifiant })
  type: TypeIdentifiant;

  @Column({ type: 'varchar', length: 255 })
  valeur: string;

  @Column({ type: 'boolean', default: false })
  verifie: boolean;
}
