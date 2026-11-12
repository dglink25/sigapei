import { ConflictException } from '@nestjs/common';
import { DefinitionMachine, MACHINES, NomMachine } from './definitions';

const def = (nom: NomMachine): DefinitionMachine => MACHINES[nom];

export function estEtatInitial(nom: NomMachine, etat: string): boolean {
  return def(nom).initiaux.includes(etat);
}

export function transitionsDepuis(nom: NomMachine, de: string): readonly string[] {
  return def(nom).transitions[de] ?? [];
}

export function peutTransiter(nom: NomMachine, de: string, vers: string): boolean {
  return transitionsDepuis(nom, de).includes(vers);
}

/** Tous les états connus d'une machine. */
export function tousLesEtats(nom: NomMachine): string[] {
  const d = def(nom);
  const s = new Set<string>(d.initiaux);
  for (const [de, vers] of Object.entries(d.transitions)) {
    s.add(de);
    vers.forEach((v) => s.add(v));
  }
  return [...s];
}

/** États finaux : aucune transition sortante. */
export function etatsFinaux(nom: NomMachine): string[] {
  return tousLesEtats(nom).filter((e) => transitionsDepuis(nom, e).length === 0);
}

export function estFinal(nom: NomMachine, etat: string): boolean {
  return transitionsDepuis(nom, etat).length === 0;
}

/** Lève une 409 explicite si la transition est interdite (la base la refuserait de toute façon). */
export function exigerTransition(nom: NomMachine, de: string, vers: string): void {
  if (de === vers) return;
  if (!peutTransiter(nom, de, vers)) {
    throw new ConflictException({
      code: 'TRANSITION_INTERDITE',
      message: `Transition interdite pour ${nom} : ${de} -> ${vers}.`,
    });
  }
}
