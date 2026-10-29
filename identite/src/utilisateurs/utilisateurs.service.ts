import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Utilisateur, StatutUtilisateur } from './utilisateur.entity';
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

  /**
   * Cree le compte administrateur d'un etablissement (role = administrateur,
   * tenantId = uuid de l'etablissement), a la demande du microservice
   * Etablissements lors de la validation definitive d'une demande
  /**
   * Génération automatique du matricule unique utilisateur selon la règle stricte :
   * XXX-code_de_son_etablissement-XXXXXXX
   * où tous les X sont des chiffres numériques (3 chiffres préfixe, 7 chiffres suffixe).
   */
  async genererMatriculeUnique(codeEtablissement?: string | null): Promise<string> {
    const code = (codeEtablissement || 'SIGA').trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'SIGA';

    let matricule = '';
    let existe = true;
    let tentatives = 0;

    while (existe && tentatives < 50) {
      tentatives++;
      // 3 chiffres (100 à 999)
      const p1 = Math.floor(100 + Math.random() * 900).toString();
      // 7 chiffres (1000000 à 9999999)
      const p2 = Math.floor(1000000 + Math.random() * 9000000).toString();
      matricule = `${p1}-${code}-${p2}`;

      const doublon = await this.utilisateurRepo.findOne({ where: { matricule } });
      if (!doublon) {
        existe = false;
      }
    }

    return matricule;
  }

  /**
   * Cree le compte administrateur suite a la validation d'un etablissement
   * (evenement RabbitMQ "etablissement.valide" - voir InterneRpcController).
   * Rappel du principe "pas d'inscription" : ce microservice ne fait
   * qu'executer la creation ordonnee par le module metier proprietaire.
   */
  async creerUtilisateurAdministrateur(params: {
    tenantId: string;
    roleId: string;
    nomComplet: string;
    email: string | null;
    telephone: string | null;
    matricule?: string | null;
  }): Promise<Utilisateur> {
    const utilisateur = this.utilisateurRepo.create({
      tenantId: params.tenantId,
      roleId: params.roleId,
      nomComplet: params.nomComplet,
      email: params.email,
      telephone: params.telephone,
      matricule: params.matricule ?? null,
      paysTelephone: null,
      statut: StatutUtilisateur.ACTIF,
    });
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
