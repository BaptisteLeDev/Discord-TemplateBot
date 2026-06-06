/**
 * Port (au sens hexagonal) entre l'API HTTP et la source des metriques metier.
 *
 * L'API ne connait PAS Discord.js : elle depend de ce contrat. L'adapter concret
 * (le BotClient, cote Discord) l'implemente. Cela permet de tester le contrat
 * /stats sans connexion Discord (cf. contract.test.ts) et garde l'invariant
 * "/health repond vite et sans I/O lourde".
 *
 * Les noms de champs suivent le contrat publie cibles ↔ bdf-monitor :
 * guildCount / userCount (PAS guilds / users).
 */
export interface BotStats {
  /** Serveurs Discord ou le bot est present. */
  guildCount: number;
  /** Utilisateurs couverts (membres caches cumules). */
  userCount: number;
  /** Commandes executees depuis le demarrage du process. */
  commandsToday: number;
  /** Latence WebSocket vers Discord en ms (-1 si non connecte). */
  discordLatencyMs: number;
  /** Version deployee du bot (source unique : package.json). */
  version: string;
}

export interface StatsProvider {
  /** Renvoie un instantane des metriques metier. Ne doit jamais lever. */
  getStats(): BotStats;
}
