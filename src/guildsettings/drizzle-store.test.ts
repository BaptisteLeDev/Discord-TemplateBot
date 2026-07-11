/**
 * L'adapter drizzle/Postgres doit honorer le MEME contrat que l'adapter en memoire
 * (#socle), execute contre un vrai moteur Postgres en memoire (pg-mem).
 */
import { describe, expect, it, spyOn } from "bun:test";
import { contratGuildSettingsStore } from "./store.contract";
import { creerDrizzleGuildSettingsStore } from "./drizzle-store";
import { creerTestDb } from "../db/test-db";
import { guildSettings } from "../db/schema";

contratGuildSettingsStore("drizzle/pg-mem", async () =>
  creerDrizzleGuildSettingsStore(creerTestDb()),
);

describe("drizzle-store — valeur en base invalide", () => {
  it("logge un warn quand une colonne non-null echoue au parse (corrompu != non configure)", async () => {
    const db = creerTestDb();
    // Valeur non-null mais non parsable (ex. locale hors du jeu supporte) : distincte
    // du cas legitime "non configure" (colonne NULL).
    await db.insert(guildSettings).values({ guildId: "g1", preferredLocale: "zz" as never });
    const warn = spyOn(console, "warn").mockImplementation(() => {});

    const settings = await creerDrizzleGuildSettingsStore(db).get("g1");

    expect(settings.preferredLocale).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
