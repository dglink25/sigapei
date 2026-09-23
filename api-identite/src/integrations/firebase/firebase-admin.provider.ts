import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

export interface FirebaseUtilisateurVerifie {
  uid: string;
  email: string | null;
  emailVerifie: boolean;
  fournisseur: 'google.com' | 'github.com' | string;
  nomAffiche: string | null;
  photoUrl: string | null;
}

/**
 * Verifie les jetons d'identite Firebase issus de la connexion Google ou GitHub
 * (Firebase Authentication cote client, verification cote serveur ici).
 *
 * Configuration a realiser par l'operateur (voir README.md) :
 *  1. Creer un projet Firebase, activer Authentication > Google et > GitHub.
 *  2. Generer une cle de compte de service (Project settings > Service accounts)
 *     et renseigner FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY.
 */
@Injectable()
export class FirebaseAdminProvider {
  private readonly logger = new Logger(FirebaseAdminProvider.name);

  constructor(private readonly config: ConfigService) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.config.get<string>('firebase.projectId'),
          clientEmail: this.config.get<string>('firebase.clientEmail'),
          privateKey: this.config.get<string>('firebase.privateKey'),
        }),
      });
      this.logger.log('Firebase Admin initialise');
    }
  }

  async verifierJeton(idToken: string): Promise<FirebaseUtilisateurVerifie> {
    try {
      const decoded = await admin.auth().verifyIdToken(idToken, true);
      const fournisseur = decoded.firebase?.sign_in_provider ?? 'inconnu';
      return {
        uid: decoded.uid,
        email: decoded.email ?? null,
        emailVerifie: !!decoded.email_verified,
        fournisseur,
        nomAffiche: (decoded as any).name ?? null,
        photoUrl: (decoded as any).picture ?? null,
      };
    } catch (err) {
      this.logger.warn(`Jeton Firebase invalide: ${(err as Error).message}`);
      throw new UnauthorizedException({
        code: 'JETON_FIREBASE_INVALIDE',
        message: 'Le jeton Google/GitHub fourni est invalide ou expire.',
      });
    }
  }
}
