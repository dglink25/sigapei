import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Limitation de debit par UTILISATEUR authentifie (pose apres l'authentification) : plusieurs usagers
 * derriere la meme adresse IP (reseau d'un etablissement, operateur mobile) ne se bloquent pas entre eux.
 * Routes sans contexte (sonde, lien signe, interne) : par adresse IP.
 */
@Injectable()
export class LimiteDebitGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.utilisateur?.uuid ? `u:${req.utilisateur.uuid}` : `ip:${req.ips?.length ? req.ips[0] : req.ip}`;
  }
}
