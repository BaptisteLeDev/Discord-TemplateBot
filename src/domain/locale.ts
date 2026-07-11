/**
 * VO Locale (PUR, socle de flotte). Le jeu de locales du gabarit est {fr, en}.
 *
 * Smart constructor `parseLocale` : seuls les tags supportes existent en aval ;
 * toute entree invalide -> null (etat invalide irrepresentable). Aucun import
 * discord.js ici (purity #16) : le mapping de l'enum Discord `Locale` vit dans
 * l'adapter `src/i18n/discord-locale.ts`.
 */
export type LocaleTag = "fr" | "en";

export const LOCALES: readonly LocaleTag[] = ["fr", "en"] as const;

export const LOCALE_DEFAUT: LocaleTag = "fr";

/** Renvoie le `LocaleTag` correspondant, ou `null` si l'entree n'est pas supportee. */
export function parseLocale(input: string): LocaleTag | null {
  const v = input.trim().toLowerCase();
  return (LOCALES as readonly string[]).includes(v) ? (v as LocaleTag) : null;
}
