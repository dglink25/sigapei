import { SetMetadata } from '@nestjs/common';

/** Route hors contexte utilisateur (sonde de sante, endpoints /interne proteges par secret). */
export const ROUTE_SANS_CONTEXTE = 'routeSansContexteUtilisateur';
export const SansContexteUtilisateur = () => SetMetadata(ROUTE_SANS_CONTEXTE, true);
