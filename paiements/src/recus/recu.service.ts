/**
 * Service Reçus
 *
 * Les reçus sont :
 *  - Universels : logo de l'établissement, données de l'établissement. Aucune mention de SIGAPEI.
 *  - Institutionnels : PDF propre avec fond filigrane (logo de l'établissement en transparence).
 *  - Signés : empreinte SHA-256 du contenu + horodatage. Signataire = nom de l'établissement.
 *  - Stockés définitivement : JAMAIS supprimés.
 *  - Accessibles via un lien sécurisé (code OTP pour invités, JWT pour utilisateurs authentifiés).
 *  - Numérotés sans trou par établissement + année (séquence atomique en BD).
 *
 * Lien de vérification publique : {slug_etab}.{RECUS_VERIFY_DOMAIN}/paiement/verif/{code_verification}
 */
import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';

export interface DonneesRecu {
  etablissement: {
    uuid: string;
    nom: string;
    slug: string;
    adresse?: string;
    telephone?: string;
    email?: string;
    logoBase64?: string;    // PNG/JPG encodé en base64
  };
  operation: {
    type: 'encaissement' | 'decaissement' | 'remboursement';
    uuid: string;
    montant: bigint;
    devise: string;
    libelle: string;
    reference: string;
    methode?: string;
    payeur?: { nom?: string; telephone?: string; email?: string };
    beneficiaire?: { nom?: string; telephone?: string };
    executeLe: Date;
  };
}

@Injectable()
export class RecuService {
  private readonly log = new Logger(RecuService.name);
  private readonly storagePath: string;
  private readonly verifyDomain: string;
  private readonly lienDureeMinutes: number;

  constructor(
    private readonly ds: DataSource,
    private readonly config: ConfigService,
  ) {
    this.storagePath = config.get<string>('recus.storagePath') ?? './storage/recus';
    this.verifyDomain = config.get<string>('recus.verifyDomain') ?? 'sigapei.bj';
    this.lienDureeMinutes = config.get<number>('recus.lienDureeMinutes') ?? 60;
  }

  async genererEtStockerRecu(donnees: DonneesRecu): Promise<{ recuUuid: string; numero: string; codeVerification: string }> {
    const annee = new Date().getFullYear();

    return this.ds.transaction(async (m) => {
      // Numéro sans trou (fonction BD atomique)
      const [{ seq }] = await m.query(
        `SELECT "paiement".prochaine_sequence_recu($1, $2) AS seq`,
        [donnees.etablissement.uuid, annee],
      );
      const numero = `${donnees.etablissement.slug.toUpperCase()}-${annee}-${String(seq).padStart(6, '0')}`;
      const codeVerification = randomBytes(16).toString('hex').toUpperCase();
      const recuUuid = uuidv4();

      // Données figées (snapshot immuable au moment de la génération)
      const donneesFigees = {
        etablissement: { ...donnees.etablissement, logoBase64: undefined }, // logo séparé
        operation: {
          ...donnees.operation,
          montant: donnees.operation.montant.toString(),
        },
        numero,
        annee,
        genere_le: new Date().toISOString(),
        signataire: donnees.etablissement.nom,
      };

      // Générer le PDF
      const pdfBytes = await this.genererPdf(donnees, numero, codeVerification);
      const empreintePdf = createHash('sha256').update(pdfBytes).digest('hex');

      // Stockage sur disque
      const dossier = path.join(this.storagePath, donnees.etablissement.uuid, String(annee));
      await fs.mkdir(dossier, { recursive: true });
      const nomFichier = `${numero}.pdf`;
      const cheminFichier = path.join(dossier, nomFichier);
      await fs.writeFile(cheminFichier, pdfBytes);

      // Clé de stockage relative (permet migration vers S3 plus tard)
      const stockageCle = path.join(donnees.etablissement.uuid, String(annee), nomFichier);
      const urlVerification = this.construireUrlVerification(donnees.etablissement.slug, codeVerification);

      await m.query(
        `INSERT INTO "paiement"."recu"
           (uuid, etablissement_uuid, annee, sequence, numero, type, objet_uuid, montant, devise,
            donnees_figees, empreinte_sha256, stockage_cle, signataire, signe_le, code_verification)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,now(),$14)`,
        [
          recuUuid, donnees.etablissement.uuid, annee, seq, numero,
          donnees.operation.type, donnees.operation.uuid,
          donnees.operation.montant.toString(), donnees.operation.devise,
          JSON.stringify({ ...donneesFigees, url_verification: urlVerification }),
          empreintePdf, stockageCle, donnees.etablissement.nom, codeVerification,
        ],
      );

      await m.query(
        `INSERT INTO "paiement"."audit_evenement"
           (etablissement_uuid, acteur_uuid, acteur_role, action, objet_type, objet_uuid, apres, resultat)
         VALUES ($1, NULL, 'systeme', 'recu.genere', 'recu', $2, $3::jsonb, 'succes')`,
        [donnees.etablissement.uuid, recuUuid, JSON.stringify({ numero, type: donnees.operation.type })],
      );

      return { recuUuid, numero, codeVerification };
    });
  }

  /** Génère un lien de téléchargement sécurisé */
  async genererLienTelechargement(
    recuUuid: string,
    destinataireType: 'payeur' | 'utilisateur',
    destinataireUuid?: string,
    codeRequis = false,
  ): Promise<{ lienUuid: string; jeton: string; codeOtp?: string; expireLe: Date }> {
    const [recu] = await this.ds.query(
      `SELECT id, etablissement_uuid FROM "paiement"."recu" WHERE uuid = $1`, [recuUuid],
    );
    if (!recu) throw new NotFoundException({ code: 'RECU_INTROUVABLE' });

    const jeton = randomBytes(32).toString('hex');
    const jetonHash = createHash('sha256').update(jeton).digest('hex');
    const expireLe = new Date(Date.now() + this.lienDureeMinutes * 60_000);

    let codeOtp: string | undefined;
    let codeHash: string | null = null;
    if (destinataireType === 'payeur' || codeRequis) {
      codeOtp = Math.floor(100_000 + Math.random() * 900_000).toString();
      codeHash = createHash('sha256').update(codeOtp).digest('hex');
    }

    const lienUuid = uuidv4();
    await this.ds.query(
      `INSERT INTO "paiement"."lien_telechargement"
         (uuid, recu_id, jeton_hash, destinataire_type, destinataire_utilisateur_uuid, code_hash, expire_le)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [lienUuid, recu.id, jetonHash, destinataireType, destinataireUuid ?? null, codeHash, expireLe],
    );

    return { lienUuid, jeton, codeOtp, expireLe };
  }

  /** Télécharge un reçu (après vérification du jeton + code OTP si invité) */
  async telechargerRecu(
    jeton: string,
    codeOtp?: string,
  ): Promise<{ pdfBytes: Buffer; numero: string; nomFichier: string }> {
    const jetonHash = createHash('sha256').update(jeton).digest('hex');
    const [lien] = await this.ds.query(
      `SELECT l.id, l.code_hash, l.tentatives, l.tentatives_max, l.utilisations, l.utilisations_max,
              l.expire_le, l.revoque, l.recu_id,
              r.stockage_cle, r.numero
         FROM "paiement"."lien_telechargement" l
         JOIN "paiement"."recu" r ON r.id = l.recu_id
        WHERE l.jeton_hash = $1`,
      [jetonHash],
    );

    if (!lien) throw new NotFoundException({ code: 'LIEN_INVALIDE' });
    if (lien.revoque) throw new ForbiddenException({ code: 'LIEN_REVOQUE' });
    if (new Date(lien.expire_le) < new Date()) throw new ForbiddenException({ code: 'LIEN_EXPIRE' });
    if (lien.utilisations >= lien.utilisations_max) throw new ForbiddenException({ code: 'LIEN_EPUISE' });

    // Vérification OTP si requis
    if (lien.code_hash) {
      if (!codeOtp) throw new ForbiddenException({ code: 'CODE_REQUIS' });
      if (lien.tentatives >= lien.tentatives_max) throw new ForbiddenException({ code: 'TROP_DE_TENTATIVES' });

      const codeHash = createHash('sha256').update(codeOtp).digest('hex');
      if (codeHash !== lien.code_hash) {
        await this.ds.query(
          `UPDATE "paiement"."lien_telechargement" SET tentatives = tentatives + 1 WHERE id = $1`, [lien.id],
        );
        throw new ForbiddenException({ code: 'CODE_INVALIDE' });
      }
    }

    // Lire le fichier
    const cheminFichier = path.join(this.storagePath, lien.stockage_cle);
    const pdfBytes = await fs.readFile(cheminFichier);

    await this.ds.query(
      `UPDATE "paiement"."lien_telechargement" SET utilisations = utilisations + 1 WHERE id = $1`, [lien.id],
    );

    return { pdfBytes, numero: lien.numero, nomFichier: `recu-${lien.numero}.pdf` };
  }

  /** Vérifie l'authenticité d'un reçu via son code de vérification (page publique) */
  async verifierRecu(codeVerification: string): Promise<Record<string, unknown>> {
    const [recu] = await this.ds.query(
      `SELECT uuid, numero, type, montant, devise, donnees_figees, empreinte_sha256, signataire, signe_le, created_at
         FROM "paiement"."recu" WHERE code_verification = $1`,
      [codeVerification.toUpperCase()],
    );
    if (!recu) throw new NotFoundException({ code: 'RECU_INTROUVABLE', message: 'Ce reçu n\'existe pas ou le code est invalide.' });

    // Vérifier l'intégrité du fichier sur disque
    let integre = false;
    try {
      const cheminFichier = path.join(this.storagePath, recu.donnees_figees?.stockage_cle ?? '');
      const pdfBytes = await fs.readFile(cheminFichier).catch(() => null);
      if (pdfBytes) {
        const empreinte = createHash('sha256').update(pdfBytes).digest('hex');
        integre = empreinte === recu.empreinte_sha256;
      }
    } catch { integre = false; }

    return {
      uuid: recu.uuid,
      numero: recu.numero,
      type: recu.type,
      montant: recu.montant,
      devise: recu.devise,
      signataire: recu.signataire,
      signe_le: recu.signe_le,
      integre,
      etablissement: (recu.donnees_figees as Record<string, unknown>)?.etablissement,
    };
  }

  /** Génère le PDF institutionnel */
  private async genererPdf(donnees: DonneesRecu, numero: string, codeVerification: string): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { width, height } = page.getSize();
    const marge = 50;

    // ── Fond filigrane (logo de l'établissement en transparence) ──
    if (donnees.etablissement.logoBase64) {
      try {
        const logoBytes = Buffer.from(donnees.etablissement.logoBase64, 'base64');
        const logoImg = donnees.etablissement.logoBase64.startsWith('iVBOR')
          ? await pdfDoc.embedPng(logoBytes)
          : await pdfDoc.embedJpg(logoBytes);
        const logoDims = logoImg.scaleToFit(400, 400);
        page.drawImage(logoImg, {
          x: (width - logoDims.width) / 2,
          y: (height - logoDims.height) / 2,
          width: logoDims.width,
          height: logoDims.height,
          opacity: 0.08,
          rotate: degrees(-30),
        });
      } catch (e) {
        this.log.warn(`Impossible d'insérer le logo filigrane: ${(e as Error).message}`);
      }
    }

    // ── En-tête : logo réel + infos établissement ──
    let yPos = height - marge;

    if (donnees.etablissement.logoBase64) {
      try {
        const logoBytes = Buffer.from(donnees.etablissement.logoBase64, 'base64');
        const logoImg = donnees.etablissement.logoBase64.startsWith('iVBOR')
          ? await pdfDoc.embedPng(logoBytes)
          : await pdfDoc.embedJpg(logoBytes);
        const logoDims = logoImg.scaleToFit(80, 60);
        page.drawImage(logoImg, { x: marge, y: yPos - logoDims.height, width: logoDims.width, height: logoDims.height });
      } catch { /* logo optionnel */ }
    }

    // Nom établissement
    page.drawText(donnees.etablissement.nom.toUpperCase(), {
      x: marge + 100, y: yPos - 20, size: 16, font: fontBold, color: rgb(0.1, 0.1, 0.4),
    });
    if (donnees.etablissement.adresse) {
      page.drawText(donnees.etablissement.adresse, {
        x: marge + 100, y: yPos - 38, size: 9, font: fontRegular, color: rgb(0.3, 0.3, 0.3),
      });
    }
    if (donnees.etablissement.telephone) {
      page.drawText(`Tél : ${donnees.etablissement.telephone}`, {
        x: marge + 100, y: yPos - 52, size: 9, font: fontRegular, color: rgb(0.3, 0.3, 0.3),
      });
    }

    yPos -= 90;

    // Ligne séparatrice
    page.drawLine({ start: { x: marge, y: yPos }, end: { x: width - marge, y: yPos }, thickness: 2, color: rgb(0.1, 0.1, 0.4) });
    yPos -= 25;

    // Titre
    const typeTitre = donnees.operation.type === 'encaissement' ? 'REÇU DE PAIEMENT'
      : donnees.operation.type === 'decaissement' ? 'REÇU DE VIREMENT'
      : 'REÇU DE REMBOURSEMENT';
    const titreLargeur = fontBold.widthOfTextAtSize(typeTitre, 18);
    page.drawText(typeTitre, {
      x: (width - titreLargeur) / 2, y: yPos, size: 18, font: fontBold, color: rgb(0.1, 0.1, 0.4),
    });
    yPos -= 35;

    // Numéro et date
    page.drawText(`N° ${numero}`, { x: marge, y: yPos, size: 11, font: fontBold, color: rgb(0, 0, 0) });
    page.drawText(
      `Date : ${donnees.operation.executeLe.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`,
      { x: width - marge - 160, y: yPos, size: 10, font: fontRegular, color: rgb(0, 0, 0) },
    );
    yPos -= 30;

    // Ligne séparatrice fine
    page.drawLine({ start: { x: marge, y: yPos }, end: { x: width - marge, y: yPos }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    yPos -= 25;

    // Corps : montant en grand
    const montantMajeur = this.formaterMontant(donnees.operation.montant, donnees.operation.devise);
    page.drawText('MONTANT', { x: marge, y: yPos, size: 10, font: fontRegular, color: rgb(0.5, 0.5, 0.5) });
    yPos -= 20;
    page.drawText(montantMajeur, { x: marge, y: yPos, size: 24, font: fontBold, color: rgb(0.1, 0.1, 0.4) });
    yPos -= 40;

    // Détails opération
    const lignes: Array<[string, string]> = [
      ['Libellé', donnees.operation.libelle],
      ['Référence', donnees.operation.reference],
    ];
    if (donnees.operation.methode) lignes.push(['Mode de paiement', donnees.operation.methode]);
    if (donnees.operation.payeur?.nom) lignes.push(['Payeur', donnees.operation.payeur.nom]);
    if (donnees.operation.payeur?.telephone) lignes.push(['Téléphone', donnees.operation.payeur.telephone]);
    if (donnees.operation.beneficiaire?.nom) lignes.push(['Bénéficiaire', donnees.operation.beneficiaire.nom]);

    for (const [label, valeur] of lignes) {
      page.drawText(label, { x: marge, y: yPos, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
      page.drawText(valeur, { x: marge + 150, y: yPos, size: 9, font: fontRegular, color: rgb(0, 0, 0) });
      yPos -= 18;
    }

    yPos -= 20;
    page.drawLine({ start: { x: marge, y: yPos }, end: { x: width - marge, y: yPos }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    yPos -= 25;

    // Code de vérification
    const urlVerif = this.construireUrlVerification(donnees.etablissement.slug, codeVerification);
    page.drawText('Vérification de l\'authenticité :', { x: marge, y: yPos, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
    yPos -= 15;
    page.drawText(urlVerif, { x: marge, y: yPos, size: 8, font: fontRegular, color: rgb(0.1, 0.4, 0.8) });
    yPos -= 15;
    page.drawText(`Code : ${codeVerification}`, { x: marge, y: yPos, size: 8, font: fontBold, color: rgb(0, 0, 0) });

    // Pied de page
    const piedPage = `Document généré le ${new Date().toLocaleDateString('fr-FR')} - ${donnees.etablissement.nom}`;
    const piedLargeur = fontRegular.widthOfTextAtSize(piedPage, 7);
    page.drawText(piedPage, {
      x: (width - piedLargeur) / 2, y: 30, size: 7, font: fontRegular, color: rgb(0.6, 0.6, 0.6),
    });

    // Signature : signataire = nom de l'établissement
    page.drawText(`Signataire : ${donnees.etablissement.nom}`, {
      x: width - marge - 200, y: 60, size: 9, font: fontBold, color: rgb(0, 0, 0),
    });
    page.drawLine({
      start: { x: width - marge - 200, y: 55 },
      end: { x: width - marge, y: 55 },
      thickness: 0.5, color: rgb(0, 0, 0),
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  private construireUrlVerification(slugEtab: string, code: string): string {
    return `https://${slugEtab}.${this.verifyDomain}/paiement/verif/${code}`;
  }

  private formaterMontant(montant: bigint, devise: string): string {
    const exposants: Record<string, number> = { XOF: 0, XAF: 0, GNF: 0, CDF: 2 };
    const exp = exposants[devise] ?? 0;
    const valeur = Number(montant) / Math.pow(10, exp);
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: devise, minimumFractionDigits: exp }).format(valeur);
  }
}
