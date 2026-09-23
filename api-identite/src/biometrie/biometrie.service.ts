import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { EmpreinteBiometrique, StatutEmpreinte } from './empreinte-biometrique.entity';
import { RedisService } from '../redis/redis.service';
import { Appareil } from '../appareils/appareil.entity';


@Injectable()
export class BiometrieService {
  constructor(
    @InjectRepository(EmpreinteBiometrique) private readonly repo: Repository<EmpreinteBiometrique>,
    @InjectRepository(Appareil) private readonly appareilRepo: Repository<Appareil>,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  private cleDefi(utilisateurUuid: string): string {
    return `webauthn:defi:${utilisateurUuid}`;
  }

  async genererOptionsEnregistrement(utilisateurUuid: string, utilisateurId: string, nomAffiche: string) {
    const dejaEnregistrees = await this.repo.find({ where: { utilisateurId } });
    const options = await generateRegistrationOptions({
      rpName: this.config.get<string>('webauthn.rpName')!,
      rpID: this.config.get<string>('webauthn.rpId')!,
      userID: Buffer.from(utilisateurUuid),
      userName: nomAffiche,
      attestationType: 'none',
      excludeCredentials: dejaEnregistrees.map((e) => ({ id: e.credentialId, type: 'public-key' })),
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' },
    });
    await this.redis.setJson(this.cleDefi(utilisateurUuid), options.challenge, 300);
    return options;
  }

  async verifierEtEnregistrer(
    utilisateurUuid: string,
    utilisateurId: string,
    appareilId: string,
    reponse: any,
  ) {
    const challengeAttendu = await this.redis.getJson<string>(this.cleDefi(utilisateurUuid));
    if (!challengeAttendu) {
      throw new BadRequestException({ code: 'DEFI_WEBAUTHN_EXPIRE', message: 'Le defi WebAuthn a expire.' });
    }
    const verification = await verifyRegistrationResponse({
      response: reponse,
      expectedChallenge: challengeAttendu,
      expectedOrigin: this.config.get<string>('webauthn.origin')!,
      expectedRPID: this.config.get<string>('webauthn.rpId')!,
    });
    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException({ code: 'WEBAUTHN_ENREGISTREMENT_ECHOUE', message: "L'enregistrement de l'empreinte a echoue." });
    }
    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
    const entite = this.repo.create({
      utilisateurId,
      appareilId,
      credentialId: credentialID,
      clePublique: Buffer.from(credentialPublicKey).toString('base64'),
      compteurSignature: String(counter),
      statut: StatutEmpreinte.ACTIVE,
    });
    await this.redis.del(this.cleDefi(utilisateurUuid));
    return this.repo.save(entite);
  }

  async genererOptionsConnexion(utilisateurUuid: string, utilisateurId: string) {
    const empreintes = await this.repo.find({ where: { utilisateurId, statut: StatutEmpreinte.ACTIVE } });
    if (empreintes.length === 0) {
      throw new NotFoundException({
        code: 'AUCUNE_EMPREINTE_ENREGISTREE',
        message: "Aucune empreinte n'est enregistree sur cet appareil pour ce compte.",
      });
    }
    const options = await generateAuthenticationOptions({
      rpID: this.config.get<string>('webauthn.rpId')!,
      allowCredentials: empreintes.map((e) => ({ id: e.credentialId, type: 'public-key' })),
      userVerification: 'required',
    });
    await this.redis.setJson(this.cleDefi(utilisateurUuid), options.challenge, 300);
    return options;
  }

  async verifierConnexion(utilisateurUuid: string, credentialId: string, reponse: any): Promise<boolean> {
    const challengeAttendu = await this.redis.getJson<string>(this.cleDefi(utilisateurUuid));
    if (!challengeAttendu) {
      throw new BadRequestException({ code: 'DEFI_WEBAUTHN_EXPIRE', message: 'Le defi WebAuthn a expire.' });
    }
    const empreinte = await this.repo.findOne({ where: { credentialId, statut: StatutEmpreinte.ACTIVE } });
    if (!empreinte) {
      throw new NotFoundException({ code: 'EMPREINTE_INTROUVABLE', message: 'Empreinte introuvable ou revoquee.' });
    }
    const verification = await verifyAuthenticationResponse({
      response: reponse,
      expectedChallenge: challengeAttendu,
      expectedOrigin: this.config.get<string>('webauthn.origin')!,
      expectedRPID: this.config.get<string>('webauthn.rpId')!,
      authenticator: {
        credentialID: empreinte.credentialId,
        credentialPublicKey: Buffer.from(empreinte.clePublique, 'base64'),
        counter: Number(empreinte.compteurSignature),
      },
    });
    if (verification.verified) {
      empreinte.compteurSignature = String(verification.authenticationInfo.newCounter);
      await this.repo.save(empreinte);
      await this.redis.del(this.cleDefi(utilisateurUuid));
    }
    return verification.verified;
  }

  async revoquer(credentialId: string, utilisateurId: string) {
    const empreinte = await this.repo.findOne({ where: { credentialId, utilisateurId } });
    if (!empreinte) throw new NotFoundException({ code: 'EMPREINTE_INTROUVABLE', message: 'Empreinte introuvable.' });
    empreinte.statut = StatutEmpreinte.REVOQUEE;
    return this.repo.save(empreinte);
  }
}