/**
 * Point d'entree — bootstrap.
 *
 * Ordre STRICT (standard de la flotte) :
 *   1. Demarrer l'API HTTP EN PREMIER (health/monitoring dispo meme si le bot rate).
 *   2. Demarrer le bot Discord ENSUITE.
 *
 * L'echec du login Discord NE DOIT PAS empecher l'API de servir /health et /stats
 * (le contrat exige une preuve de vie independante de l'etat de connexion Discord).
 */
import { loadConfig } from './config';
import { createApiServer } from './api/server';
import { BotClient } from './client';

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  console.log(`Demarrage du bot (env: ${config.env})`);

  const bot = new BotClient();

  // 1. API d'abord.
  const api = await createApiServer({
    statsProvider: bot,
    logger: config.isDevelopment,
  });
  await api.listen({ port: config.api.port, host: config.api.host });
  console.log(`API a l'ecoute sur http://${config.api.host}:${config.api.port}`);

  // 2. Bot ensuite. Un echec de login ne fait pas tomber l'API.
  try {
    await bot.start(config.discord.token);
  } catch (err) {
    console.error("Echec du login Discord (l'API reste disponible) :", err);
  }

  setupGracefulShutdown(async () => {
    await bot.destroy();
    await api.close();
  });
}

function setupGracefulShutdown(cleanup: () => Promise<void>): void {
  const shutdown = (signal: string): void => {
    console.log(`Signal ${signal} recu, arret propre...`);
    cleanup()
      .then(() => process.exit(0))
      .catch((err) => {
        console.error("Erreur a l'arret :", err);
        process.exit(1);
      });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

void bootstrap();
