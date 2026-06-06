/**
 * Configuration centralisee, validee par zod.
 *
 * Bun charge automatiquement le `.env` du repertoire courant : pas besoin de
 * `dotenv`. On valide `process.env` contre un schema type. Toute la provenance
 * de la config passe par ce module (mandat ARCHITECTURE.md : un seul endroit).
 */
import { z } from 'zod';

const envSchema = z.object({
  // Discord
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN est requis'),
  DISCORD_APPLICATION_ID: z.string().min(1, 'DISCORD_APPLICATION_ID est requis'),
  DISCORD_GUILD_ID: z.string().optional(),

  // API HTTP (Fastify) — sert le contrat monitoring /health + /stats.
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),

  // Environnement
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

export interface Config {
  discord: {
    token: string;
    applicationId: string;
    guildId: string | undefined;
  };
  api: { port: number; host: string };
  env: Env['NODE_ENV'];
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
      .map((i) => `  - ${i.path.join('.') || '(racine)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuration invalide :\n${issues}`);
  }
  const e = parsed.data;
  return {
    discord: {
      token: e.DISCORD_TOKEN,
      applicationId: e.DISCORD_APPLICATION_ID,
      guildId: e.DISCORD_GUILD_ID,
    },
    api: { port: e.PORT, host: e.HOST },
    env: e.NODE_ENV,
    isDevelopment: e.NODE_ENV === 'development',
    isProduction: e.NODE_ENV === 'production',
    isTest: e.NODE_ENV === 'test',
  };
}
