import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Droit d'un utilisateur sur un service assigne a son etablissement (table users_services_etablissement). */
@Entity({ name: 'users_services_etablissement', schema: 'identite' })
export class UtilisateurServiceEtablissement {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Column({ name: 'etablissement_services_id', type: 'bigint' })
  etablissementServicesId: string;

  @Column({ type: 'boolean', default: false })
  autorised: boolean;
}
