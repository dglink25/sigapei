import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MethodeConnexion, StatutTentative, TentativeConnexion } from './tentative-connexion.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(TentativeConnexion) private readonly repo: Repository<TentativeConnexion>,
  ) {}

  async journaliser(params: {
    utilisateurId?: string | null;
    methode: MethodeConnexion;
    statut: StatutTentative;
    ip?: string | null;
    motifEchec?: string | null;
  }) {
    const entite = this.repo.create({
      utilisateurId: params.utilisateurId ?? null,
      methode: params.methode,
      statut: params.statut,
      ip: params.ip ?? null,
      motifEchec: params.motifEchec ?? null,
    });
    return this.repo.save(entite);
  }

  async listerParTenant(tenantId: string, limite = 100) {
    return this.repo.find({ order: { creeLe: 'DESC' }, take: limite });
  }
}
