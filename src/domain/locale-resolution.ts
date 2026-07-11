/**
 * Resolution de locale (PUR, socle de flotte). Determine la locale effective d'une
 * interaction selon la priorite : override /config > locale de la guilde Discord > FR.
 *
 * PUR : ne connait pas discord.js. L'appelant (adapter) traduit la locale Discord en
 * `LocaleTag` via `src/i18n/discord-locale.ts` avant d'appeler cette fonction.
 */
import { LOCALE_DEFAUT, type LocaleTag } from "./locale";

export function resoudreLocale(p: {
  /** Override explicite pose via /config (colonne `preferred_locale`). */
  overrideGuild: LocaleTag | null;
  /** Locale de la guilde Discord, deja mappee en `LocaleTag` (ou null si non supportee). */
  localeGuildeDiscord: LocaleTag | null;
}): LocaleTag {
  return p.overrideGuild ?? p.localeGuildeDiscord ?? LOCALE_DEFAUT;
}
