/**
 * Adapter discord-locale (hors domaine). Traduit un tag de locale Discord
 * (`guild.preferredLocale`, ex. "en-US", "fr") vers un `LocaleTag` supporte, par
 * PREFIXE de langue. Renvoie `null` si la langue n'est pas dans le jeu du gabarit.
 *
 * Le mapping vit ICI (pas dans le VO) : ainsi le domaine n'importe jamais l'enum
 * Discord `Locale` et le purity test #16 reste vert.
 */
import type { LocaleTag } from "../domain/locale";

/** Prefixe de langue Discord (avant le "-") -> LocaleTag du gabarit. */
const PREFIXE_VERS_TAG: Record<string, LocaleTag> = { fr: "fr", en: "en" };

export function mapperDiscordLocale(discordLocale: string | null | undefined): LocaleTag | null {
  if (!discordLocale) return null;
  const prefixe = discordLocale.toLowerCase().split("-")[0] ?? "";
  return PREFIXE_VERS_TAG[prefixe] ?? null;
}
