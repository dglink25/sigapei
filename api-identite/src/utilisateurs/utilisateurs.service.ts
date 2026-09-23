import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utilisateur } from './utilisateur.entity';
import { IdentifiantRecuperation } from './identifiant-recuperation.entity';
import { QuestionSecurite } from './question-securite.entity';

@Injectable()
export class UtilisateursService {
  constructor(
    @InjectRepository(Utilisateur) private readonly utilisateurRepo: Repository<Utilisateur>,
    @InjectRepository(IdentifiantRecuperation) private readonly recupRepo: Repository<IdentifiantRecuperation>,
    @InjectRepository(QuestionSecurite) private readonly questionRepo: Repository<QuestionSecurite>,
  ) {}

  trouverParTelephone(telephoneE164: string) {
    return this.utilisateurRepo.findOne({ where: { telephone: telephoneE164 } });
  }

  trouverParEmail(email: string) {
    return this.utilisateurRepo.findOne({ where: { email: email.toLowerCase() } });
  }

  trouverParMatricule(matricule: string) {
    return this.utilisateurRepo.findOne({ where: { matricule } });
  }

  async trouverParUuidOuEchouer(uuid: string): Promise<Utilisateur> {
    const utilisateur = await this.utilisateurRepo.findOne({ where: { uuid } });
    if (!utilisateur) {
      throw new NotFoundException({ code: 'UTILISATEUR_INTROUVABLE', message: 'Utilisateur introuvable.' });
    }
    return utilisateur;
  }

  trouverParId(id: string) {
    return this.utilisateurRepo.findOne({ where: { id } });
  }

  async lierFirebaseUid(utilisateur: Utilisateur, fournisseur: 'google' | 'github', uid: string) {
    if (fournisseur === 'google') utilisateur.firebaseUidGoogle = uid;
    else utilisateur.firebaseUidGithub = uid;
    return this.utilisateurRepo.save(utilisateur);
  }

  async ajouterIdentifiantRecuperation(utilisateurId: string, type: 'email' | 'telephone', valeur: string) {
    const entite = this.recupRepo.create({ utilisateurId, type: type as any, valeur, verifie: false });
    return this.recupRepo.save(entite);
  }

  async verifierIdentifiantRecuperation(id: string) {
    await this.recupRepo.update({ id }, { verifie: true });
  }

  async listerIdentifiantsRecuperation(utilisateurId: string) {
    return this.recupRepo.find({ where: { utilisateurId } });
  }

  async enregistrerQuestionSecurite(utilisateurId: string, questionId: string, reponseHash: string) {
    const existante = await this.questionRepo.findOne({ where: { utilisateurId, questionId } });
    if (existante) {
      existante.reponseHash = reponseHash;
      return this.questionRepo.save(existante);
    }
    const entite = this.questionRepo.create({ utilisateurId, questionId, reponseHash });
    return this.questionRepo.save(entite);
  }

  async listerQuestionsSecurite(utilisateurId: string) {
    return this.questionRepo.find({ where: { utilisateurId } });
  }

  masquerTelephone(telephone: string): string {
    return `${telephone.slice(0, 4)}${'*'.repeat(Math.max(telephone.length - 6, 2))}${telephone.slice(-2)}`;
  }

  masquerEmail(email: string): string {
    const [nom, domaine] = email.split('@');
    return `${nom.slice(0, 1)}${'*'.repeat(Math.max(nom.length - 1, 2))}@${domaine}`;
  }
}
