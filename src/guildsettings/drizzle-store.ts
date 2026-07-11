/**
 * Adapter NEON/drizzle du port GuildSettingsStore (#socle). Persiste les reglages par
 * guilde dans la table `guild_settings`. Chaque setter fait un upsert ciblant SA
 * colonne (idiome `onConflictDoUpdate`, cf. coverplayerstats/drizzle-store.ts), sans
 * ecraser l'autre reglage.
 *
 * Doit honorer `store.contract.ts` a l'identique de l'adapter en memoire. En lecture,
 * les VO (LocaleTag, EmbedColor) sont RE-VALIDES : la colonne brute ne fuit jamais en
 * type marque sans passer par son smart constructor.
 */
import { eq, sql } from "drizzle-orm";
import { parseLocale } from "../domain/locale";
import { parseEmbedColor } from "../domain/embed-color";
import { REGLAGES_DEFAUT, type GuildSettings, type GuildSettingsStore } from "./store";
import type { Db } from "../db/client";
import { guildSettings } from "../db/schema";

/**
 * Re-valide une colonne brute via son smart constructor. Une valeur NULL = "non
 * configure" (silencieux, normal). Une valeur NON-null qui echoue au parse = donnee
 * CORROMPUE en base : on la traite comme non configuree MAIS on logge un warn, pour ne
 * pas confondre silencieusement les deux cas (diagnostic d'une corruption reelle).
 */
function revalider<TBrut, T>(
  brut: TBrut | null,
  parser: (valeur: TBrut) => T | null,
  colonne: string,
  guildId: string,
): T | null {
  if (brut === null) return null;
  const valeur = parser(brut);
  if (valeur === null) {
    console.warn(
      `Reglage guild_settings.${colonne} invalide en base (guilde ${guildId}, valeur ` +
        `${JSON.stringify(brut)}) : ignore et traite comme non configure.`,
    );
  }
  return valeur;
}

export function creerDrizzleGuildSettingsStore(db: Db): GuildSettingsStore {
  return {
    async get(guildId): Promise<GuildSettings> {
      const lignes = await db
        .select({
          preferredLocale: guildSettings.preferredLocale,
          embedColor: guildSettings.embedColor,
        })
        .from(guildSettings)
        .where(eq(guildSettings.guildId, guildId));
      const ligne = lignes[0];
      if (ligne === undefined) return REGLAGES_DEFAUT;
      return {
        preferredLocale: revalider(ligne.preferredLocale, parseLocale, "preferred_locale", guildId),
        embedColor: revalider(ligne.embedColor, parseEmbedColor, "embed_color", guildId),
      };
    },
    async setLocale(guildId, locale): Promise<void> {
      await db
        .insert(guildSettings)
        .values({ guildId, preferredLocale: locale })
        .onConflictDoUpdate({
          target: guildSettings.guildId,
          set: { preferredLocale: locale, updatedAt: sql`now()` },
        });
    },
    async setEmbedColor(guildId, color): Promise<void> {
      await db
        .insert(guildSettings)
        .values({ guildId, embedColor: color })
        .onConflictDoUpdate({
          target: guildSettings.guildId,
          set: { embedColor: color, updatedAt: sql`now()` },
        });
    },
  };
}
