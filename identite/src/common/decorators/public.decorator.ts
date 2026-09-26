import { SetMetadata } from '@nestjs/common';

/** Marque un endpoint comme public (aucun JWT requis). */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
