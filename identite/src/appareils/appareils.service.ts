import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appareil } from './appareil.entity';
import { SessionRedisService } from '../jetons/session.redis.service';
import { TokenBlacklistRedis } from '../jetons/token-blacklist.redis';
import { RabbitmqService } from '../rabbitmq/rabbitmq.service';

@Injectable()
export class AppareilsService {
  constructor(
    @InjectRepository(Appareil) private readonly repo: Repository<Appareil>,
    private readonly sessions: SessionRedisService,
    private readonly blacklist: TokenBlacklistRedis,
    private readonly rabbitmq: RabbitmqService,
  ) {}

  /** Retrouve ou cree l'enregistrement d'appareil a partir de son identifiant local persistant. */
  async trouverOuCreer(utilisateurId: string, identifiantLocal: string, meta?: { nomAppareil?: string; type?: string; os?: string; ip?: string }) {
    let appareil = await this.repo.findOne({ where: { utilisateurId, identifiantLocal } });
    if (!appareil) {
      appareil = this.repo.create({
        utilisateurId,
        identifiantLocal,
        nomAppareil: meta?.nomAppareil ?? null,
        type: meta?.type ?? null,
        os: meta?.os ?? null,
        derniereIp: meta?.ip ?? null,
        faitConfiance: false,
      });
    } else if (meta?.ip) {
      appareil.derniereIp = meta.ip;
    }
    return this.repo.save(appareil);
  }

  async marquerDeConfiance(uuid: string, utilisateurId: string) {
    const appareil = await this.repo.findOne({ where: { uuid, utilisateurId } });
    if (!appareil) throw new NotFoundException({ code: 'APPAREIL_INTROUVABLE', message: 'Appareil introuvable.' });
    appareil.faitConfiance = true;
    return this.repo.save(appareil);
  }

  async listerPourUtilisateur(utilisateurId: string) {
    return this.repo.find({ where: { utilisateurId }, order: { derniereActivite: 'DESC' } });
  }

  /** Revoque un appareil precis : session Redis + empreinte biometrique associees. */
  async revoquer(uuid: string, utilisateurUuid: string, utilisateurId: string) {
    const appareil = await this.repo.findOne({ where: { uuid, utilisateurId } });
    if (!appareil) throw new NotFoundException({ code: 'APPAREIL_INTROUVABLE', message: 'Appareil introuvable.' });

    const sessionsJti = await this.sessions.listerSessionsUtilisateur(utilisateurUuid);
    for (const jti of sessionsJti) {
      const session = await this.sessions.recuperer(jti);
      if (session?.appareilUuid === uuid) {
        await this.sessions.revoquer(jti);
        await this.blacklist.revoquer(jti, 60 * 60 * 24 * 30);
      }
    }
    await this.repo.remove(appareil);
    this.rabbitmq.publier('appareil.revoque', { appareilUuid: uuid, utilisateurUuid });
  }

  async verifierAppartenance(uuid: string, utilisateurId: string) {
    const appareil = await this.repo.findOne({ where: { uuid, utilisateurId } });
    if (!appareil) throw new ForbiddenException({ code: 'APPAREIL_NON_RATTACHE', message: 'Cet appareil ne vous appartient pas.' });
    return appareil;
  }
}
