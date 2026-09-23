export enum CanalOtp {
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
}

export interface OtpEnregistre {
  codeHash: string;
  cible: string;
  canal: CanalOtp | 'sms+whatsapp';
  nbTentatives: number;
  utilisateurId: string;
  creeLe: string;
}
