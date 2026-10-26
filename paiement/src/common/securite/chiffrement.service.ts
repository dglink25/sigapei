import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OptionsChiffrement {
  /** Trousseau : version -> clé de 32 octets en base64. */
  cles: Record<string, string>;
  versionCourante: number;
  /** Clé HMAC (32 octets base64) pour les empreintes de recherche et d'unicité. */
  cleEmpreinte: string;
}

export class ChiffrementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChiffrementError';
  }
}

/**
 * Chiffrement des données sensibles au repos : AES-256-GCM, trousseau versionné (rotation sans interruption),
 * contexte lié au chiffré (AAD) : un numéro chiffré pour un établissement ne peut pas être rejoué ailleurs.
 * Format : v<version>.<iv>.<tag>.<chiffré> (base64url). Les clés viennent UNIQUEMENT de l'environnement.
 */
@Injectable()
export class ChiffrementService {
  private readonly cles = new Map<number, Buffer>();
  private readonly cleEmpreinte: Buffer;
  readonly versionCourante: number;

  constructor(options: OptionsChiffrement) {
    for (const [version, valeur] of Object.entries(options.cles)) {
      const cle = Buffer.from(valeur, 'base64');
      if (cle.length !== 32) throw new ChiffrementError(`La cle de chiffrement v${version} doit faire 32 octets (base64)`);
      this.cles.set(Number(version), cle);
    }
    if (!this.cles.has(options.versionCourante)) {
      throw new ChiffrementError(`Cle de chiffrement courante introuvable (v${options.versionCourante})`);
    }
    this.versionCourante = options.versionCourante;
    this.cleEmpreinte = Buffer.from(options.cleEmpreinte, 'base64');
    if (this.cleEmpreinte.length !== 32) throw new ChiffrementError("La cle d'empreinte doit faire 32 octets (base64)");
  }

  /** Construit le service depuis l'environnement (CLES_CHIFFREMENT, CLE_CHIFFREMENT_COURANTE, CLE_EMPREINTE). */
  static depuisConfig(config: ConfigService): ChiffrementService {
    const brut = config.get<string>('chiffrement.cles');
    const cleEmpreinte = config.get<string>('chiffrement.cleEmpreinte');
    if (!brut || !cleEmpreinte) throw new ChiffrementError('CLES_CHIFFREMENT et CLE_EMPREINTE sont obligatoires');
    let cles: Record<string, string>;
    try {
      cles = JSON.parse(brut);
    } catch {
      throw new ChiffrementError('CLES_CHIFFREMENT doit etre un JSON { "1": "<base64>" }');
    }
    return new ChiffrementService({ cles, versionCourante: config.get<number>('chiffrement.versionCourante') ?? 1, cleEmpreinte });
  }

  chiffrer(clair: string, contexte: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.cles.get(this.versionCourante)!, iv);
    cipher.setAAD(Buffer.from(contexte, 'utf8'));
    const chiffre = Buffer.concat([cipher.update(clair, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v${this.versionCourante}.${iv.toString('base64url')}.${tag.toString('base64url')}.${chiffre.toString('base64url')}`;
  }

  dechiffrer(jeton: string, contexte: string): string {
    const m = /^v(\d+)\.([\w-]+)\.([\w-]+)\.([\w-]*)$/.exec(jeton);
    if (!m) throw new ChiffrementError('Donnee chiffree illisible');
    const cle = this.cles.get(Number(m[1]));
    if (!cle) throw new ChiffrementError(`Cle de chiffrement v${m[1]} indisponible`);
    try {
      const decipher = createDecipheriv('aes-256-gcm', cle, Buffer.from(m[2], 'base64url'));
      decipher.setAAD(Buffer.from(contexte, 'utf8'));
      decipher.setAuthTag(Buffer.from(m[3], 'base64url'));
      return Buffer.concat([decipher.update(Buffer.from(m[4], 'base64url')), decipher.final()]).toString('utf8');
    } catch {
      throw new ChiffrementError('Donnee chiffree alteree ou contexte invalide');
    }
  }

  /** Version de clé utilisée par un chiffré (pour repérer ceux à re-chiffrer après rotation). */
  versionDe(jeton: string): number {
    const m = /^v(\d+)\./.exec(jeton);
    if (!m) throw new ChiffrementError('Donnee chiffree illisible');
    return Number(m[1]);
  }

  /** HMAC-SHA256 : même valeur + même contexte = même empreinte (unicité, recherche), sans révéler la valeur. */
  empreinte(valeur: string, contexte: string): string {
    return createHmac('sha256', this.cleEmpreinte).update(`${contexte}\u0000${valeur}`).digest('hex');
  }

  /** "+22997123456" -> "+229*****456" : affichage sans exposer le numéro complet. */
  static masquerNumero(numero: string): string {
    const n = numero.replace(/\s+/g, '');
    if (n.length <= 5) return '*'.repeat(n.length);
    const debut = n.length >= 9 ? 4 : 0;
    const fin = n.length >= 9 ? 3 : 2;
    return `${n.slice(0, debut)}${'*'.repeat(n.length - debut - fin)}${n.slice(-fin)}`;
  }
}
