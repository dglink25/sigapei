import { Body, Controller, Ip, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { IdentifierDto } from './dto/identifier.dto';
import { EnvoyerOtpDto } from './dto/envoyer-otp.dto';
import { VerifierOtpDto } from './dto/verifier-otp.dto';
import { FirebaseConnexionDto } from './dto/firebase-connexion.dto';
import {
  WebauthnOptionsConnexionDto,
  WebauthnVerifierConnexionDto,
  WebauthnVerifierEnregistrementDto,
} from './dto/webauthn-connexion.dto';
import { RafraichirTokenDto } from './dto/rafraichir-token.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BiometrieService } from '../biometrie/biometrie.service';
import { AppareilsService } from '../appareils/appareils.service';
import { UtilisateursService } from '../utilisateurs/utilisateurs.service';

@ApiTags('Authentification')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly biometrieService: BiometrieService,
    private readonly appareilsService: AppareilsService,
    private readonly utilisateursService: UtilisateursService,
  ) {}

  @Public()
  @Post('identifier')
  @ApiOperation({ summary: "Recoit l'identifiant saisi (tel./e-mail/matricule) et retourne la methode de verification applicable." })
  identifier(@Body() dto: IdentifierDto) {
    return this.authService.identifier(dto.identifiant);
  }

  @Public()
  @Post('otp/envoyer')
  @ApiOperation({ summary: 'Declenche l\'envoi d\'un code OTP (SMS+WhatsApp ou e-mail), apres validation du CAPTCHA.' })
  envoyerOtp(@Body() dto: EnvoyerOtpDto) {
    return this.authService.envoyerOtp(dto.identifiant, dto.captchaToken);
  }

  @Public()
  @Post('otp/verifier')
  @ApiOperation({ summary: 'Verifie le code OTP saisi ; en cas de succes, ouvre une session (JWT).' })
  verifierOtp(@Body() dto: VerifierOtpDto, @Ip() ip: string) {
    return this.authService.verifierOtp(dto.identifiant, dto.code, dto.appareil, ip);
  }

  @Public()
  @Post('firebase/verifier')
  @ApiOperation({
    summary:
      'Connexion Google ou GitHub (via Firebase Authentication). Le compte doit deja exister ; connexion systematique sans OTP.',
  })
  connexionFirebase(@Body() dto: FirebaseConnexionDto, @Ip() ip: string) {
    return this.authService.connexionFirebase(dto.idToken, dto.appareil, ip);
  }

  @Public()
  @Post('webauthn/options-connexion')
  @ApiOperation({ summary: 'Genere les options/challenge WebAuthn pour une connexion par matricule.' })
  optionsConnexion(@Body() dto: WebauthnOptionsConnexionDto) {
    return this.authService.optionsConnexionMatricule(dto.matricule, dto.identifiantLocal);
  }

  @Public()
  @Post('webauthn/verifier-connexion')
  @ApiOperation({ summary: "Verifie la reponse WebAuthn de l'appareil et authentifie l'utilisateur." })
  verifierConnexion(@Body() dto: WebauthnVerifierConnexionDto, @Ip() ip: string) {
    return this.authService.verifierConnexionMatricule(dto.matricule, dto.identifiantLocal, dto.reponse, dto.appareilInfo, ip);
  }

  @ApiBearerAuth()
  @Post('webauthn/options-enregistrement')
  @ApiOperation({ summary: "Genere les options d'enregistrement d'une nouvelle empreinte (utilisateur deja connecte)." })
  async optionsEnregistrement(
    @CurrentUser('sub') utilisateurUuid: string,
    @CurrentUser('utilisateurId') utilisateurId: string,
    @Body('identifiantLocal') identifiantLocal: string,
  ) {
    const utilisateur = await this.utilisateursService.trouverParUuidOuEchouer(utilisateurUuid);
    return this.biometrieService.genererOptionsEnregistrement(utilisateurUuid, utilisateurId, utilisateur.nomComplet);
  }

  @ApiBearerAuth()
  @Post('webauthn/verifier-enregistrement')
  @ApiOperation({ summary: 'Valide et enregistre la nouvelle empreinte (credential + cle publique).' })
  async verifierEnregistrement(
    @CurrentUser('sub') utilisateurUuid: string,
    @CurrentUser('utilisateurId') utilisateurId: string,
    @Body() dto: WebauthnVerifierEnregistrementDto,
  ) {
    const appareil = await this.appareilsService.trouverOuCreer(utilisateurId, dto.identifiantLocal);
    return this.biometrieService.verifierEtEnregistrer(utilisateurUuid, utilisateurId, appareil.id, dto.reponse);
  }

  @Public()
  @Post('token/rafraichir')
  @ApiOperation({ summary: "Emet un nouveau jeton d'acces a partir d'un refresh token valide (avec rotation)." })
  rafraichir(@Body() dto: RafraichirTokenDto) {
    return this.authService.rafraichirToken(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Post('deconnexion')
  @ApiOperation({ summary: 'Revoque la session courante (jeton mis en liste noire Redis).' })
  deconnexion(@CurrentUser('jti') jti: string, @CurrentUser('sub') utilisateurUuid: string) {
    return this.authService.deconnexion(jti, utilisateurUuid);
  }
}
