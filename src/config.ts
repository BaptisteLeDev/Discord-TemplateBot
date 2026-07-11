/**
 * Configuration centralisee, validee par zod.
 *
 * Bun charge automatiquement le `.env` du repertoire courant : pas besoin de
 * `dotenv`. On valide `process.env` contre un schema type. Toute la provenance
 * de la config passe par ce module (mandat ARCHITECTURE.md : un seul endroit).
 */
import { z } from "zod";

const envSchema = z.object({
  // Discord
  DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN est requis"),
  DISCORD_APPLICATION_ID: z.string().min(1, "DISCORD_APPLICATION_ID est requis"),
  DISCORD_GUILD_ID: z.string().optional(),

  // API HTTP (Fastify) - sert le contrat monitoring /health + /stats.
  PORT: z.coerce.number().int().positive().default(3001),
  // Défaut LOOPBACK : le monitoring n'est joignable que localement / via tailnet.
  // Passer à 0.0.0.0 est une décision consciente, gated par STATS_TOKEN (cf. ci-dessous).
  HOST: z.string().default("127.0.0.1"),
  // Token bearer protégeant /stats et /. Requis dès que HOST n'est pas loopback.
  STATS_TOKEN: z.string().min(1).optional(),
  // Allowlist CORS (origines séparées par des virgules). Vide = CORS fermé (défaut sûr).
  STATS_CORS_ORIGINS: z.string().optional(),

  // Persistance (Neon/Postgres) — OPTIONNELLE. Absente = stores en memoire (socle de
  // personnalisation par serveur). Presente = adapter drizzle branche au boot.
  DATABASE_URL: z.string().min(1).optional(),

  // Environnement
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

/** Une adresse de bind considérée comme locale (pas d'exposition réseau). */
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const isLoopback = (host: string): boolean => LOOPBACK_HOSTS.has(host);

export type Env = z.infer<typeof envSchema>;

export interface Config {
  discord: {
    token: string;
    applicationId: string;
    guildId: string | undefined;
  };
  api: { port: number; host: string; statsToken: string | undefined; corsOrigins: string[] };
  /** URL Postgres/Neon. `undefined` = persistance desactivee (stores en memoire). */
  databaseUrl: string | undefined;
  env: Env["NODE_ENV"];
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
}

/**
 * Parse et valide l'environnement. Leve une erreur explicite et agregee si
 * invalide : aucun catch silencieux, le boot doit echouer fort sur config
 * manquante. Injecter `env` permet de tester sans toucher process.env.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(racine)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Configuration invalide :\n${issues}`);
  }
  const e = parsed.data;

  // Deny-by-default : exposer l'API hors loopback SANS token est interdit. Le boot
  // échoue fort plutôt que de publier /stats en clair (mandat sécurité de la flotte).
  if (!isLoopback(e.HOST) && !e.STATS_TOKEN) {
    throw new Error(
      `Configuration invalide :\n  - HOST=${e.HOST} expose l'API hors loopback sans STATS_TOKEN. ` +
        `Définis STATS_TOKEN, ou garde HOST sur 127.0.0.1.`,
    );
  }

  const corsOrigins = (e.STATS_CORS_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  return {
    discord: {
      token: e.DISCORD_TOKEN,
      applicationId: e.DISCORD_APPLICATION_ID,
      guildId: e.DISCORD_GUILD_ID,
    },
    api: { port: e.PORT, host: e.HOST, statsToken: e.STATS_TOKEN, corsOrigins },
    databaseUrl: e.DATABASE_URL,
    env: e.NODE_ENV,
    isDevelopment: e.NODE_ENV === "development",
    isProduction: e.NODE_ENV === "production",
    isTest: e.NODE_ENV === "test",
  };
}
