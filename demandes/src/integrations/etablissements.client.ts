import { Injectable } from '@nestjs/common';
import { CacheMemoire } from '../common/cache/cache-memoire';
import { DependanceIndisponible } from '../common/erreurs/erreurs';
import { charge, HttpInterneService } from '../common/http/http-interne.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reference d'etablissement (uuid d'Identite/du front, ou identifiant numerique de la Gateway) -> tenant_id.
 * Meme contrat que le TenantResolver de Scolarite : GET /v1/interne/etablissements?uuid= => { id, uuid }.
 * La correspondance ne change jamais : cache 10 minutes. Aucun tenant devine.
 */
@Injectable()
export class EtablissementsClient {
  private readonly cache = new CacheMemoire<number | null>();

  constructor(private readonly http: HttpInterneService) {}

  async resoudre(reference: string | null | undefined): Promise<number | null> {
    const ref = String(reference ?? '').trim();
    if (/^[1-9][0-9]{0,17}$/.test(ref)) return Number(ref);
    if (!UUID.test(ref)) return null;

    const uuid = ref.toLowerCase();
    const enCache = this.cache.lire(uuid);
    if (enCache !== undefined) return enCache;

    let e: any = charge(
      await this.http.get('etablissements', '/v1/interne/etablissements', {
        uuid,
      }),
    );
    if (Array.isArray(e)) e = e[0] ?? null;
    if (e === null || e === undefined) {
      this.cache.ecrire(uuid, null, 60_000);
      return null;
    }
    if (typeof e !== 'object' || e.id === undefined || typeof e.uuid !== 'string') {
      throw new DependanceIndisponible('Etablissements ne fournit pas `id` et `uuid` sur /v1/interne/etablissements?uuid=.');
    }
    if (e.uuid.toLowerCase() !== uuid) {
      throw new DependanceIndisponible('Etablissements a ignore le filtre uuid.');
    }
    const id = Number(e.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new DependanceIndisponible("Identifiant d'etablissement invalide.");
    this.cache.ecrire(uuid, id, 600_000);
    return id;
  }
}
