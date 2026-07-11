/**
 * Decorateur de cache (port -> port) du GuildSettingsStore (#socle). Reduit les
 * lectures de l'adapter sous-jacent (Neon) : les reglages d'une guilde sont mis en
 * cache par guilde, avec un TTL borne. Les ecritures INVALIDENT l'entree de cache
 * (write-invalidate) : la prochaine lecture recharge la valeur autoritative depuis
 * l'inner. On troque une micro-optim (un set evitait une relecture) contre la
 * coherence : un write-through partiel effacerait, sur cache froid, l'autre champ
 * deja persiste en DB pendant tout le TTL (regression de #config).
 *
 * Hypothese MONO-PROCESS (D14) : un conteneur par bot -> cache in-process coherent.
 * Un scaling horizontal exigerait une invalidation cross-process (hors perimetre) ;
 * le TTL borne alors la staleness a `ttlMs`.
 */
import type { GuildSettings, GuildSettingsStore } from "./store";

const TTL_DEFAUT_MS = 60_000;

interface Entree {
  valeur: GuildSettings;
  expireA: number;
}

export function creerCachedGuildSettingsStore(
  inner: GuildSettingsStore,
  options: { ttlMs?: number; maintenant?: () => number } = {},
): GuildSettingsStore {
  const ttlMs = options.ttlMs ?? TTL_DEFAUT_MS;
  const maintenant = options.maintenant ?? Date.now;
  const cache = new Map<string, Entree>();

  const memoriser = (guildId: string, valeur: GuildSettings): void => {
    cache.set(guildId, { valeur, expireA: maintenant() + ttlMs });
  };

  return {
    async get(guildId): Promise<GuildSettings> {
      const entree = cache.get(guildId);
      if (entree !== undefined && maintenant() < entree.expireA) {
        return entree.valeur;
      }
      const valeur = await inner.get(guildId);
      memoriser(guildId, valeur);
      return valeur;
    },
    async setLocale(guildId, locale): Promise<void> {
      await inner.setLocale(guildId, locale);
      cache.delete(guildId);
    },
    async setEmbedColor(guildId, color): Promise<void> {
      await inner.setEmbedColor(guildId, color);
      cache.delete(guildId);
    },
  };
}
