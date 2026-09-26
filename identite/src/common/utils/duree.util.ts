/** Convertit une duree style "15m", "30d", "1h" en secondes. */
export function dureeEnSecondes(duree: string): number {
  const correspondance = duree.match(/^(\d+)([smhd])$/);
  if (!correspondance) return parseInt(duree, 10) || 900;
  const valeur = parseInt(correspondance[1], 10);
  const unite = correspondance[2];
  const multiplicateurs: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return valeur * multiplicateurs[unite];
}
