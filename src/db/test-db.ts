/**
 * Fabrique de DB EN MEMOIRE pour les tests (pg-mem) : un vrai moteur Postgres en
 * memoire, sans Neon ni reseau. Permet d'executer les tests de CONTRAT du store
 * drizzle contre une vraie execution SQL, pas un mock. Le schema est cree par DDL
 * explicite (miroir de src/db/schema.ts ; les migrations drizzle-kit restent la
 * source de verite pour le deploiement Neon).
 *
 * On branche drizzle via le driver `pg-proxy` en deleguant chaque requete au Pool
 * node-postgres EMULE de pg-mem (`createPg`) : ce detour evite que le driver
 * node-postgres exige `getTypeParser` (absent de pg-mem) et gere la substitution
 * des parametres `$1`.
 */
import { newDb } from "pg-mem";
import { drizzle } from "drizzle-orm/pg-proxy";
import * as schema from "./schema";
import type { Db } from "./client";

const DDL = `
  CREATE TABLE guild_settings (
    guild_id varchar(20) PRIMARY KEY,
    preferred_locale varchar(5),
    embed_color integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
`;

export function creerTestDb(): Db {
  const mem = newDb();
  mem.public.none(DDL);
  const { Pool } = mem.adapters.createPg();
  const pool = new Pool();
  const proxy = drizzle(
    async (sql, params) => {
      const res = await pool.query({ text: sql, values: params });
      const champs: { name: string }[] = res.fields ?? [];
      const rows = res.rows.map((r: Record<string, unknown>) =>
        champs.length > 0 ? champs.map((f) => r[f.name]) : Object.values(r),
      );
      return { rows };
    },
    { schema },
  );
  return proxy as unknown as Db;
}
