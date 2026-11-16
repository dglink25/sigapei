import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, hkdfSync, timingSafeEqual } from 'crypto';
import PDFDocument from 'pdfkit';
import { Sujet } from '../demandes/eligibilite.service';

export interface InstantaneDocument {
  reference: string;
  type: string;
  en_tete: string | null;
  titre: string;
  corps: string;
  mentions: string | null;
  signataire: string | null;
  lieu: string | null;
  date_emission: string;
  sujet: Sujet;
}

const VALIDITE_LIEN_S = 300;

/**
 * Documents delivres (CDC §9, §18) :
 *  - l'instantane (texte deja rendu + donnees imprimees) est fige dans la demande avec son empreinte SHA-256 ;
 *  - le PDF en est produit a la demande : toujours identique, rien a stocker ni a synchroniser ;
 *  - telechargement uniquement par lien signe HMAC (demande + etablissement + expiration, 5 minutes).
 * La cle de signature est derivee (HKDF) du secret interne : aucune variable d'environnement de plus,
 * et une cle distincte de celui-ci pour cet usage.
 */
@Injectable()
export class DocumentsService {
  constructor(private readonly config: ConfigService) {}

  construire(
    type: { nom: string; modele: Record<string, string | undefined> },
    reference: string,
    sujet: Sujet,
    surcharge: { corps?: string; nom_complet?: string } = {},
  ): { instantane: InstantaneDocument; empreinte: string } {
    const m = type.modele ?? {};
    const date = new Date();
    const sujetFinal: Sujet = {
      ...sujet,
      nom_complet: surcharge.nom_complet?.trim() || sujet.nom_complet,
    };
    const variables: Record<string, string> = {
      nom_complet: sujetFinal.nom_complet || '',
      matricule: sujetFinal.matricule ?? '',
      classe: sujetFinal.classe ?? '',
      date_naissance: sujetFinal.date_naissance ? this.dateFr(new Date(sujetFinal.date_naissance)) : '',
      fonction: sujetFinal.fonction ?? '',
      date_du_jour: this.dateFr(date),
      reference,
    };
    const rendre = (texte: string) => texte.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, v) => variables[v] ?? '');

    const instantane: InstantaneDocument = {
      reference,
      type: type.nom,
      en_tete: m.en_tete ?? null,
      titre: (m.titre ?? type.nom).toUpperCase(),
      corps: rendre(surcharge.corps?.trim() || m.corps || `Document établi au nom de {{nom_complet}}.`),
      mentions: m.mentions ? rendre(m.mentions) : null,
      signataire: m.signataire ?? null,
      lieu: m.lieu ?? null,
      date_emission: date.toISOString(),
      sujet: sujetFinal,
    };
    return { instantane, empreinte: this.empreinte(instantane) };
  }

  empreinte(i: InstantaneDocument): string {
    return createHash('sha256').update(JSON.stringify(i)).digest('hex');
  }

  lienSigne(demandeUuid: string, tenantId: number): { url: string; expire_le: string } {
    const expire = Math.floor(Date.now() / 1000) + VALIDITE_LIEN_S;
    const signature = this.signer(`${demandeUuid}.${tenantId}.${expire}`);
    return {
      url: `/v1/documents/${demandeUuid}?t=${tenantId}&e=${expire}&s=${signature}`,
      expire_le: new Date(expire * 1000).toISOString(),
    };
  }

  /** Signature valide et non expiree ? (comparaison en temps constant) */
  verifierLien(demandeUuid: string, t: string, e: string, s: string): number | null {
    if (!/^[1-9][0-9]{0,17}$/.test(t) || !/^[0-9]{10}$/.test(e) || !/^[0-9a-f]{64}$/.test(s)) return null;
    if (Number(e) < Math.floor(Date.now() / 1000)) return null;
    const attendue = Buffer.from(this.signer(`${demandeUuid}.${t}.${e}`), 'hex');
    const recue = Buffer.from(s, 'hex');
    return attendue.length === recue.length && timingSafeEqual(attendue, recue) ? Number(t) : null;
  }

  async pdf(i: InstantaneDocument, empreinte: string): Promise<Buffer> {
    return new Promise((ok, ko) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 60, bottom: 60, left: 64, right: 64 },
        info: { Title: i.titre, Author: 'SIGAPEI' },
      });
      const morceaux: Buffer[] = [];
      doc.on('data', (c: Buffer) => morceaux.push(c));
      doc.on('end', () => ok(Buffer.concat(morceaux)));
      doc.on('error', ko);

      const largeur = doc.page.width - 128;
      if (i.en_tete) doc.font('Helvetica-Bold').fontSize(12).fillColor('#1a1a1a').text(i.en_tete, { align: 'center', width: largeur });
      doc.moveDown(0.3).font('Helvetica').fontSize(9).fillColor('#555').text(`Référence : ${i.reference}`, {
        align: 'center',
        width: largeur,
      });
      doc.moveDown(2).font('Helvetica-Bold').fontSize(16).fillColor('#1a1a1a').text(i.titre, { align: 'center', width: largeur });
      doc.moveDown(2).font('Helvetica').fontSize(11.5).text(i.corps, { align: 'justify', width: largeur, lineGap: 4 });

      const date = this.dateFr(new Date(i.date_emission));
      doc
        .moveDown(3)
        .fontSize(11)
        .text(`${i.lieu ? i.lieu + ', le' : 'Le'} ${date}`, {
          align: 'right',
          width: largeur,
        });
      if (i.signataire) doc.moveDown(0.5).font('Helvetica-Bold').text(i.signataire, { align: 'right', width: largeur });
      if (i.mentions) doc.moveDown(3).font('Helvetica-Oblique').fontSize(9).fillColor('#444').text(i.mentions, { width: largeur });

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#777')
        .text(`Document délivré par SIGAPEI - empreinte SHA-256 : ${empreinte}`, 64, doc.page.height - 45, {
          width: largeur,
          align: 'center',
          lineBreak: false,
        });
      doc.end();
    });
  }

  nomFichier(i: InstantaneDocument): string {
    const base = `${i.titre}-${i.reference}`.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return (
      base
        .replace(/[^A-Za-z0-9_-]+/g, '-')
        .replace(/-+/g, '-')
        .toLowerCase() + '.pdf'
    );
  }

  private signer(texte: string): string {
    const secret = String(this.config.get('internalApiSecret') ?? '');
    const cle = Buffer.from(hkdfSync('sha256', secret, 'sigapei-demandes', 'liens-documents', 32));
    return createHmac('sha256', cle).update(texte).digest('hex');
  }

  private dateFr(d: Date): string {
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Africa/Porto-Novo',
    });
  }
}
