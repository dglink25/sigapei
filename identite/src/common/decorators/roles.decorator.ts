import { SetMetadata } from '@nestjs/common';

/** Restreint un endpoint aux codes de role systeme listes (ex: 'super_admin', 'administrateur'). */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
