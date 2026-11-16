/** Petit cache memoire a duree de vie (par instance), borne en taille pour ne jamais grossir sans limite. */
export class CacheMemoire<T> {
  private readonly valeurs = new Map<string, { valeur: T; expireA: number }>();

  constructor(private readonly tailleMax = 5000) {}

  lire(cle: string): T | undefined {
    const e = this.valeurs.get(cle);
    if (!e) return undefined;
    if (e.expireA <= Date.now()) {
      this.valeurs.delete(cle);
      return undefined;
    }
    return e.valeur;
  }

  ecrire(cle: string, valeur: T, dureeMs: number): void {
    if (this.valeurs.size >= this.tailleMax) {
      const plusAncienne = this.valeurs.keys().next().value;
      if (plusAncienne !== undefined) this.valeurs.delete(plusAncienne);
    }
    this.valeurs.set(cle, { valeur, expireA: Date.now() + dureeMs });
  }

  vider(): void {
    this.valeurs.clear();
  }
}
