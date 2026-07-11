/**
 * Application des migrations drizzle au demarrage (auto-migrate on boot), quand une
 * `DATABASE_URL` est fournie. Le schema (`drizzle/*.sql`, genere par drizzle-kit
 * depuis src/db/schema.ts) reste l'unique source de verite ; on ne touche jamais la
 * DB a la main.
 *
 * Pool DEDIE et ephemere : la migration ouvre sa propre connexion puis la ferme, sans
 * partager le pool long-running de l'app (src/db/client.ts).
 */
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const DOSSIER_MIGRATIONS = "drizzle";

export async function appliquerMigrations(databaseUrl: string): Promise<void> {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 10_000,
  });
  try {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: DOSSIER_MIGRATIONS });
  } finally {
    await pool.end();
  }
}
