/**
 * Client Postgres (Neon) + instance drizzle-orm. C'est l'UNIQUE point qui ouvre une
 * connexion DB (mandat ARCHITECTURE.md : appels externes centralises). Les stores
 * drizzle recoivent l'instance `db`, jamais le Pool brut. Pool reduit : le bot est un
 * seul process long-running.
 *
 * La persistance est OPTIONNELLE : `DATABASE_URL` est injecte par l'environnement (cf.
 * src/config.ts). En son absence, le bot retombe sur les stores en memoire (cf.
 * src/index.ts) : le gabarit demarre et fonctionne sans DB.
 */
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

export function creerDb(connectionString: string): { db: Db; pool: Pool } {
  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  pool.on("error", (err) => {
    console.error("Erreur du pool pg :", err);
  });
  const db = drizzle(pool, { schema });
  return { db, pool };
}

export { schema };
