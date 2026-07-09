/**
 * Serveur API Fastify du gabarit.
 *
 * Expose le contrat monitoring cibles ↔ bdf-monitor :
 *   - GET /health : preuve de vie. 2xx rapide, SANS I/O Discord. TOUJOURS public.
 *   - GET /stats  : metriques metier (guildCount / userCount / ...). Protégé si token.
 *   - GET /       : info API (racine). Protégé si token.
 *
 * L'API ne depend pas de Discord.js : elle recoit un StatsProvider (port). C'est
 * l'ACL ciblee - le modele Discord ne fuit pas dans la couche HTTP.
 *
 * Durcissement (socle de flotte, issue #15) centralisé ICI, donc hérité par tout
 * bot dérivé : bearer optionnel sur /stats et /, CORS fermé par défaut (allowlist
 * explicite seulement), rate-limit. Le bind loopback + le deny-by-default vivent
 * dans config.ts (le boot refuse d'exposer /stats sans token).
 */
import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import type { StatsProvider } from "./stats-provider";
import { safeTokenEqual } from "./token";

export interface ApiServerOptions {
  statsProvider: StatsProvider;
  /** Active les logs Fastify (desactives en test pour une sortie propre). */
  logger?: boolean;
  /** Si défini, /stats et / exigent `Authorization: Bearer <token>`. /health reste public. */
  statsToken?: string | undefined;
  /** Allowlist CORS. Vide/absent = CORS non enregistré (fermé, défaut sûr). */
  corsOrigins?: string[];
  /** Fenêtre de rate-limit. Défaut 120 req/min. `false` désactive (tests). */
  rateLimit?: { max: number; timeWindow: string } | false;
}

/** Endpoints protégés par le token quand il est configuré. /health en est exclu. */
const PROTECTED_PATHS = new Set(["/", "/stats"]);

/**
 * Construit et configure l'instance Fastify (sans l'ecouter : le bootstrap
 * appelle `.listen`). Retourne l'instance pour permettre `.inject` en test.
 */
export async function createApiServer(options: ApiServerOptions): Promise<FastifyInstance> {
  const { statsProvider, logger = false, statsToken, corsOrigins = [], rateLimit: rl } = options;

  const app = Fastify({ logger });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error);
    void reply.status(error.statusCode ?? 500).send({ error: "Internal Server Error" });
  });

  if (rl !== false) {
    await app.register(rateLimit, rl ?? { max: 120, timeWindow: "1 minute" });
  }

  // CORS fermé par défaut : on n'enregistre le plugin QUE si une allowlist est
  // fournie. Un monitoring server-to-server n'a pas besoin de CORS ouvert.
  if (corsOrigins.length > 0) {
    await app.register(cors, { origin: corsOrigins });
  }

  // Auth bearer sur les endpoints protégés (jamais /health, invariant du contrat).
  if (statsToken) {
    // Hook callback synchrone (safeTokenEqual est sync) : envoyer la 401 SANS appeler
    // done() stoppe le cycle proprement, sans le double-send des hooks async.
    app.addHook("onRequest", (request, reply, done) => {
      const path = request.url.split("?")[0] ?? request.url;
      if (!PROTECTED_PATHS.has(path)) {
        done();
        return;
      }
      const header = request.headers.authorization ?? "";
      const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
      if (provided.length === 0 || !safeTokenEqual(provided, statsToken)) {
        void reply.status(401).send({ error: "Unauthorized" });
        return;
      }
      done();
    });
  }

  // Racine - info API.
  app.get("/", () => ({
    name: "Discord TemplateBot API",
    endpoints: { health: "/health", stats: "/stats" },
  }));

  // Preuve de vie. Ne touche PAS Discord : repond immediatement (invariant contrat).
  app.get("/health", () => ({ status: "ok", uptime: process.uptime() }));

  // Metriques metier - noms imposes par le contrat publie.
  app.get("/stats", () => statsProvider.getStats());

  await app.ready();
  return app;
}
