/**
 * Point d'entree - bootstrap.
 *
 * Ordre STRICT (standard de la flotte) :
 *   1. Demarrer l'API HTTP EN PREMIER (health/monitoring dispo meme si le bot rate).
 *   2. Creer le store (migration DB) ENSUITE, de facon NON fatale : un blip Neon au
 *      demarrage degrade vers le stockage memoire au lieu de tuer le process, pour que
 *      /health et /stats restent servis.
 *   3. Login Discord en dernier. Un echec de login n'empeche pas l'API de servir.
 *
 * Le bot expose `getStats` sans dependre du store : il peut donc etre passe a l'API
 * comme StatsProvider AVANT que la DB soit prete. Les commandes (qui, elles, consomment
 * le store) sont branchees apres, via `brancherCommandes`.
 */
import { loadConfig, type Config } from "./config";
import { createApiServer } from "./api/server";
import { BotClient } from "./client";
import { creerDb } from "./db/client";
import { appliquerMigrations } from "./db/migrate";
import { creerCachedGuildSettingsStore } from "./guildsettings/cached-store";
import { creerDrizzleGuildSettingsStore } from "./guildsettings/drizzle-store";
import { creerMemoryGuildSettingsStore } from "./guildsettings/memory-store";
import type { GuildSettingsStore } from "./guildsettings/store";
import type { StatsProvider } from "./api/stats-provider";
import { executerAuDemarrage } from "./run-entrypoint";

/** Un store pret a l'emploi + son `fermer` (drainage des connexions au shutdown). */
export interface StoreOuvert {
  readonly store: GuildSettingsStore;
  readonly fermer: () => Promise<void>;
}

/** Ports du bot dont le bootstrap a besoin (le vrai BotClient les satisfait). */
export interface BotLike extends StatsProvider {
  brancherCommandes(store?: GuildSettingsStore): void;
  start(token: string): Promise<void>;
  destroy(): Promise<void>;
}

/** Poignee minimale de l'API : de quoi la fermer au shutdown. */
export interface ApiHandle {
  readonly close: () => Promise<void>;
}

/** Deps injectables du bootstrap (defauts reels ; les tests injectent des doubles). */
export interface BootstrapDeps {
  loadConfig?: () => Config;
  creerBot?: () => BotLike;
  demarrerApi?: (statsProvider: StatsProvider, config: Config) => Promise<ApiHandle>;
  creerStore?: (databaseUrl: string | undefined) => Promise<StoreOuvert>;
  brancherSignaux?: (cleanup: () => Promise<void>) => void;
}

/** Deps injectables de la composition du store (pour tester la degradation sans DB). */
export interface CreerStoreDeps {
  migrer?: (databaseUrl: string) => Promise<void>;
  ouvrirDrizzle?: (databaseUrl: string) => {
    store: GuildSettingsStore;
    fermer: () => Promise<void>;
  };
  creerMemoire?: () => GuildSettingsStore;
}

/**
 * Compose la source des reglages par guilde. Persistance OPTIONNELLE et NON fatale :
 * avec `DATABASE_URL`, on migre puis on branche l'adapter drizzle ; si la migration ou
 * l'ouverture echoue, on DEGRADE vers le store memoire (log warn) plutot que de tuer le
 * boot. Sans `DATABASE_URL`, on part directement en memoire. Toujours decore d'un cache.
 */
export async function creerSettingsStore(
  databaseUrl: string | undefined,
  deps: CreerStoreDeps = {},
): Promise<StoreOuvert> {
  const migrer = deps.migrer ?? appliquerMigrations;
  const ouvrirDrizzle =
    deps.ouvrirDrizzle ??
    ((url: string) => {
      const { db, pool } = creerDb(url);
      return { store: creerDrizzleGuildSettingsStore(db), fermer: () => pool.end() };
    });
  const creerMemoire = deps.creerMemoire ?? creerMemoryGuildSettingsStore;

  const enMemoire = (): StoreOuvert => ({
    store: creerCachedGuildSettingsStore(creerMemoire()),
    fermer: async () => {},
  });

  if (databaseUrl === undefined) {
    console.log("Persistance desactivee (pas de DATABASE_URL) : reglages en memoire.");
    return enMemoire();
  }

  try {
    await migrer(databaseUrl);
    const { store, fermer } = ouvrirDrizzle(databaseUrl);
    console.log("Persistance Neon activee : reglages par serveur en base.");
    return { store: creerCachedGuildSettingsStore(store), fermer };
  } catch (err) {
    console.warn(
      "Echec de la migration/connexion DB au demarrage : degradation vers stockage memoire " +
        "(les reglages ne seront PAS persistes jusqu'au prochain redemarrage). Cause :",
      err,
    );
    return enMemoire();
  }
}

async function demarrerApiParDefaut(
  statsProvider: StatsProvider,
  config: Config,
): Promise<ApiHandle> {
  const api = await createApiServer({
    statsProvider,
    logger: config.isDevelopment,
    statsToken: config.api.statsToken,
    corsOrigins: config.api.corsOrigins,
  });
  await api.listen({ port: config.api.port, host: config.api.host });
  console.log(`API a l'ecoute sur http://${config.api.host}:${config.api.port}`);
  return { close: () => api.close() };
}

export async function bootstrap(deps: BootstrapDeps = {}): Promise<void> {
  const chargerConfig = deps.loadConfig ?? loadConfig;
  const creerBot = deps.creerBot ?? ((): BotLike => new BotClient());
  const demarrerApi = deps.demarrerApi ?? demarrerApiParDefaut;
  const creerStore = deps.creerStore ?? ((url) => creerSettingsStore(url));
  const brancherSignaux = deps.brancherSignaux ?? setupGracefulShutdown;

  const config = chargerConfig();
  console.log(`Demarrage du bot (env: ${config.env})`);

  // Le bot sert de StatsProvider sans dependre du store -> on peut le passer a l'API
  // avant la DB.
  const bot = creerBot();

  // 1. API D'ABORD : /health et /stats dispo avant toute I/O DB ou login Discord.
  const api = await demarrerApi(bot, config);

  // 2. Store ENSUITE (migration non fatale ; degrade en memoire si la DB flanche).
  const { store, fermer } = await creerStore(config.databaseUrl);
  bot.brancherCommandes(store);

  // 3. Login Discord en dernier. Un echec ne fait pas tomber l'API.
  try {
    await bot.start(config.discord.token);
  } catch (err) {
    console.error("Echec du login Discord (l'API reste disponible) :", err);
  }

  brancherSignaux(async () => {
    await bot.destroy();
    await api.close();
    await fermer();
  });
}

/**
 * Fabrique un handler de shutdown IDEMPOTENT : un second signal (double SIGINT/SIGTERM,
 * ou SIGINT puis SIGTERM) est ignore, sinon `cleanup` re-fermerait des ressources deja
 * fermees (api.close re-rejette) et produirait un code de sortie trompeur.
 */
export function creerShutdown(
  cleanup: () => Promise<void>,
  onDone: (code: number) => void,
): (signal: string) => void {
  let arretEnCours = false;
  return (signal: string): void => {
    if (arretEnCours) return;
    arretEnCours = true;
    console.log(`Signal ${signal} recu, arret propre...`);
    cleanup()
      .then(() => onDone(0))
      .catch((err) => {
        console.error("Erreur a l'arret :", err);
        onDone(1);
      });
  };
}

function setupGracefulShutdown(cleanup: () => Promise<void>): void {
  const shutdown = creerShutdown(cleanup, (code) => process.exit(code));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

// Point d'entree reel uniquement quand ce fichier est lance directement (pas importe
// par un test). Tout rejet -> log + exit non nul (pas d'unhandledRejection muet).
if (import.meta.main) {
  void executerAuDemarrage("bootstrap", bootstrap);
}
