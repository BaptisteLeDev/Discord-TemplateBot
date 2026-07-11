/**
 * Adapter EN MEMOIRE du port GuildSettingsStore (#socle). Reference de comportement
 * pour les tests de contrat ; l'adapter drizzle doit se comporter a l'identique. C'est
 * le defaut du gabarit quand aucune `DATABASE_URL` n'est fournie (persistance optionnelle).
 */
import { REGLAGES_DEFAUT, type GuildSettings, type GuildSettingsStore } from "./store";

export function creerMemoryGuildSettingsStore(): GuildSettingsStore {
  const parGuild = new Map<string, GuildSettings>();

  const patch = (guildId: string, delta: Partial<GuildSettings>): void => {
    const courant = parGuild.get(guildId) ?? REGLAGES_DEFAUT;
    parGuild.set(guildId, { ...courant, ...delta });
  };

  return {
    async get(guildId): Promise<GuildSettings> {
      return { ...(parGuild.get(guildId) ?? REGLAGES_DEFAUT) };
    },
    async setLocale(guildId, locale): Promise<void> {
      patch(guildId, { preferredLocale: locale });
    },
    async setEmbedColor(guildId, color): Promise<void> {
      patch(guildId, { embedColor: color });
    },
  };
}
