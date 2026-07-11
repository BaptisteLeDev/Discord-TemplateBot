/**
 * Schema de persistance (drizzle-orm / Postgres-Neon) — PREMIERE table du gabarit.
 * Introduit avec le socle de personnalisation par serveur. La persistance est
 * OPTIONNELLE : sans `DATABASE_URL`, le bot retombe sur le store en memoire.
 *
 * Minimisation des donnees (mandat D8) : table etroite, colonnes TYPEES, aucun JSON,
 * aucune PII (guildId public), aucune TTL (config, pas activite). Les toggles/salons/
 * roles specifiques d'un bot s'ajoutent en COLONNES typees via sa propre migration,
 * jamais en blob JSON. Une migration drizzle-kit est generee depuis ce fichier.
 */
import { pgTable, varchar, integer, timestamp } from "drizzle-orm/pg-core";

export const guildSettings = pgTable("guild_settings", {
  guildId: varchar("guild_id", { length: 20 }).primaryKey(),
  /** Override de langue pose via /config. `null` = pas d'override. */
  preferredLocale: varchar("preferred_locale", { length: 5 }),
  /** Override de couleur d'embed (entier RGB 24 bits). `null` = couleur defaut du bot. */
  embedColor: integer("embed_color"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
