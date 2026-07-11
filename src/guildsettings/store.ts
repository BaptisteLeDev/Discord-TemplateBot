/**
 * Port GuildSettingsStore — PROVENANCE des REGLAGES par guilde (socle de flotte).
 * Source unique des personnalisations serveur (langue, couleur d'embed) ; /config et
 * le theming consomment ce port, jamais la DB directement (mandat ARCHITECTURE.md).
 *
 * Convention flotte : le PORT vit dans son bounded context (`src/guildsettings/`), PAS
 * dans `src/domain/`. Seuls les VO purs (LocaleTag, EmbedColor) viennent du domaine.
 * Asynchrone : l'adapter Neon fait de l'I/O ; l'adapter memoire est la reference.
 *
 * Minimisation (mandat D8) : ne stocke que guildId (public), locale et couleur. Aucune
 * donnee utilisateur, aucun texte libre, aucun JSON, aucune TTL (config, pas activite).
 */
import type { LocaleTag } from "../domain/locale";
import type { EmbedColor } from "../domain/embed-color";

export interface GuildSettings {
  /** Override de langue pose via /config. `null` = pas d'override (resolution auto). */
  readonly preferredLocale: LocaleTag | null;
  /** Override de couleur d'embed. `null` = couleur par defaut du bot. */
  readonly embedColor: EmbedColor | null;
}

/** Reglages par defaut d'une guilde jamais configuree (jamais null en sortie de get). */
export const REGLAGES_DEFAUT: GuildSettings = { preferredLocale: null, embedColor: null };

export interface GuildSettingsStore {
  /** Reglages de la guilde. JAMAIS null : renvoie les defauts si la guilde est absente. */
  get(guildId: string): Promise<GuildSettings>;
  /** Pose (ou efface avec `null`) l'override de langue, sans toucher la couleur. */
  setLocale(guildId: string, locale: LocaleTag | null): Promise<void>;
  /** Pose (ou efface avec `null`) l'override de couleur, sans toucher la langue. */
  setEmbedColor(guildId: string, color: EmbedColor | null): Promise<void>;
}
