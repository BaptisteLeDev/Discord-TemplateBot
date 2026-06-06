/**
 * Serveur API Fastify du gabarit.
 *
 * Expose le contrat monitoring cibles ↔ bdf-monitor :
 *   - GET /health : preuve de vie. 2xx rapide, SANS I/O Discord.
 *   - GET /stats  : metriques metier (guildCount / userCount / ...).
 *   - GET /       : info API (racine).
 *
 * L'API ne depend pas de Discord.js : elle recoit un StatsProvider (port). C'est
 * l'ACL ciblee — le modele Discord ne fuit pas dans la couche HTTP.
 */
import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import type { StatsProvider } from './stats-provider';

export interface ApiServerOptions {
  statsProvider: StatsProvider;
  /** Active les logs Fastify (desactives en test pour une sortie propre). */
  logger?: boolean;
}

/**
 * Construit et configure l'instance Fastify (sans l'ecouter : le bootstrap
 * appelle `.listen`). Retourne l'instance pour permettre `.inject` en test.
 */
export async function createApiServer(options: ApiServerOptions): Promise<FastifyInstance> {
  const { statsProvider, logger = false } = options;

  const app = Fastify({ logger });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error);
    void reply.status(error.statusCode ?? 500).send({ error: 'Internal Server Error' });
  });

  await app.register(cors, { origin: true });

  // Racine — info API.
  app.get('/', () => ({
    name: 'Discord TemplateBot API',
    endpoints: { health: '/health', stats: '/stats' },
  }));

  // Preuve de vie. Ne touche PAS Discord : repond immediatement (invariant contrat).
  app.get('/health', () => ({ status: 'ok', uptime: process.uptime() }));

  // Metriques metier — noms imposes par le contrat publie.
  app.get('/stats', () => statsProvider.getStats());

  await app.ready();
  return app;
}
