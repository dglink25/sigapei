import { Column, Entity, ManyToOne, JoinColumn, PrimaryGeneratedColumn } from 'typeorm';
import { Utilisateur } from './utilisateur.entity';

@Entity({ name: 'question_securite', schema: 'identite' })
export class QuestionSecurite {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: string;

  @ManyToOne(() => Utilisateur, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'utilisateur_id' })
  utilisateur: Utilisateur;

  @Column({ name: 'utilisateur_id', type: 'bigint' })
  utilisateurId: string;

  @Column({ name: 'question_id', type: 'varchar', length: 64 })
  questionId: string;

  @Column({ name: 'reponse_hash', type: 'varchar', length: 255 })
  reponseHash: string;
}
