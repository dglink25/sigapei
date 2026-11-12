/**
 * Tâches planifiées du service Paiement.
 *
 * - reglementEncaissements()     : toutes les 5 min - passe les encaissements approuvés en "disponible"
 * - verificationDecaissements()  : toutes les 2 min - vérifie le statut des décaissements en cours
 * - dispatcherNotifications()    : toutes les 1 min - envoie les notifications en attente
 * - reglementAutomatique()       : calcule les décaissements automatiques selon le mode (immediat/quotidien/hebdomadaire)
 * - nettoyageLiensExpires()      : toutes les heures - révoque les liens de téléchargement expirés
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { EncaissementService } from '../encaissements/encaissement.service';
import { DecaissementService } from '../decaissements/decaissement.service';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class SchedulerService {
  private readonly log = new Logger(SchedulerService.name);

  constructor(
    private readonly ds: DataSource,
    private readonly encaissements: EncaissementService,
    private readonly decaissements: DecaissementService,
    private readonly notifications: NotificationService,
  ) {}

  /** Règlement des encaissements dont le délai d'attente est écoulé */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async reglementEncaissements(): Promise<void> {
    try {
      const n = await this.ds.transaction((m) => this.encaissements.regler(m));
      if (n > 0) this.log.log(`Règlement : ${n} encaissement(s) passé(s) en disponible`);
    } catch (err: unknown) {
      this.log.error(`reglementEncaissements: ${(err as Error).message}`);
    }
  }

  /** Vérification périodique des décaissements en cours */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async verificationDecaissements(): Promise<void> {
    try {
      await this.decaissements.verifierDecaissementsEnCours();
    } catch (err: unknown) {
      this.log.error(`verificationDecaissements: ${(err as Error).message}`);
    }
  }

  /** Envoi des notifications en attente */
  @Cron(CronExpression.EVERY_MINUTE)
  async dispatcherNotifications(): Promise<void> {
    try {
      await this.notifications.traiterNotificationsEnAttente();
    } catch (err: unknown) {
      this.log.error(`dispatcherNotifications: ${(err as Error).message}`);
    }
  }

  /**
   * Règlement automatique des encaissements selon le mode configuré par l'établissement.
   * - Immédiat  : géré en temps réel lors de l'approbation de l'encaissement
   * - Quotidien : chaque jour à 08:00
   * - Hebdomadaire : chaque lundi à 08:00
   */
  @Cron('0 8 * * *') // chaque jour à 08:00
  async reglementQuotidien(): Promise<void> {
    try {
      const jourSemaine = new Date().getDay(); // 0=dim, 1=lun, ...
      await this.declencherReglementAutomatique('quotidien');
      if (jourSemaine === 1) { // lundi
        await this.declencherReglementAutomatique('hebdomadaire', 1);
      }
    } catch (err: unknown) {
      this.log.error(`reglementQuotidien: ${(err as Error).message}`);
    }
  }

  private async declencherReglementAutomatique(mode: string, jourSemaine?: number): Promise<void> {
    // Récupérer les établissements configurés pour ce mode de règlement
    const params: Array<Record<string, unknown>> = await this.ds.query(
      `SELECT pe.etablissement_uuid, pe.devise, pe.reglement_montant_min
         FROM "paiement"."parametre_etablissement" pe
        WHERE pe.reglement_mode = $1
          AND ($2::int IS NULL OR pe.reglement_jour_semaine = $2)
          AND pe.decaissement_actif = true`,
      [mode, jourSemaine ?? null],
    );

    for (const param of params) {
      try {
        // Vérifier s'il y a des fonds disponibles au-dessus du montant minimum
        const [solde] = await this.ds.query(
          `SELECT c.solde FROM "paiement"."compte" c
             JOIN "paiement"."portefeuille" p ON p.id = c.portefeuille_id
            WHERE p.etablissement_uuid = $1 AND c.devise = $2 AND c.type = 'disponible'`,
          [param.etablissement_uuid, param.devise],
        );
        const soldeDispo = BigInt(String(solde?.solde ?? '0'));
        const montantMin = BigInt(String(param.reglement_montant_min ?? '0'));

        if (soldeDispo >= montantMin && soldeDispo > 0n) {
          // Créer un décaissement de reversement automatique
          this.log.log(`Règlement auto (${mode}) : ${param.etablissement_uuid} ${soldeDispo} ${param.devise}`);
          // Le reversement effectif vers le compte bancaire de l'établissement
          // est géré via l'API FedaPay payouts : à implémenter en phase 2
          // selon le compte_reception_defaut configuré
        }
      } catch (err: unknown) {
        this.log.error(`Règlement auto ${param.etablissement_uuid}: ${(err as Error).message}`);
      }
    }
  }

  /** Nettoyage des liens de téléchargement expirés */
  @Cron(CronExpression.EVERY_HOUR)
  async nettoyageLiensExpires(): Promise<void> {
    try {
      await this.ds.query(
        `UPDATE "paiement"."lien_telechargement" SET revoque = true WHERE expire_le < now() AND revoque = false`,
      );
      this.log.debug('Liens de téléchargement expirés révoqués');
    } catch (err: unknown) {
      this.log.error(`nettoyageLiensExpires: ${(err as Error).message}`);
    }
  }

  /** Traitement de l'outbox (publication des événements vers les autres microservices) */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async traiterOutbox(): Promise<void> {
    try {
      const rows: Array<Record<string, unknown>> = await this.ds.query(
        `SELECT id, topic, payload FROM "paiement"."outbox_evenement"
          WHERE statut = 'en_attente' AND prochaine_tentative <= now() AND tentatives < 5
          ORDER BY created_at ASC LIMIT 100 FOR UPDATE SKIP LOCKED`,
      );
      for (const evt of rows) {
        try {
          // Publication RabbitMQ/Redis (à brancher sur le transport configuré)
          // Pour l'instant, on marque comme publié (le microservice consommateur s'abonnera)
          await this.ds.query(
            `UPDATE "paiement"."outbox_evenement" SET statut = 'publie', publie_le = now() WHERE id = $1`,
            [evt.id],
          );
        } catch (err: unknown) {
          const tentatives = 1;
          await this.ds.query(
            `UPDATE "paiement"."outbox_evenement"
                SET tentatives = tentatives + 1, erreur = $1,
                    prochaine_tentative = now() + (interval '1 second' * power(2, tentatives))
              WHERE id = $2`,
            [(err as Error).message, evt.id],
          );
        }
      }
    } catch (err: unknown) {
      this.log.error(`traiterOutbox: ${(err as Error).message}`);
    }
  }
}
