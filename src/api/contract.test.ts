/**
 * Tests d'acceptation du CONTRAT cibles ↔ bdf-monitor.
 *
 * Source de verite : le contrat monitoring (Published Language du bounded context
 * Fleet Monitoring). Ces tests verifient que le bot expose les endpoints attendus
 * AVANT son inscription au registre (gate d'onboarding) :
 *   - GET /health : 2xx rapide, SANS bot Discord connecte (pas d'I/O lourde).
 *   - GET /stats  : objet JSON ; champs guildCount / userCount typage number.
 *
 * On injecte un StatsProvider factice : le contrat de l'API doit etre verifiable
 * SANS connexion Discord reelle (cf. invariant /health repond vite et sans I/O).
 */
import { describe, expect, it } from "bun:test";
import { createApiServer } from "./server";
import type { StatsProvider } from "./stats-provider";

/** Provider factice : bot non connecte (aucune guild), valeurs deterministes. */
const offlineProvider: StatsProvider = {
  getStats: () => ({
    guildCount: 0,
    userCount: 0,
    commandsToday: 0,
    discordLatencyMs: -1,
    version: "0.0.0",
  }),
};

describe("contrat cibles ↔ bdf-monitor", () => {
  it("GET /health repond 2xx sans bot connecte", async () => {
    const app = await createApiServer({ statsProvider: offlineProvider });
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBeGreaterThanOrEqual(200);
    expect(res.statusCode).toBeLessThan(300);
    await app.close();
  });

  it("GET /health repond vite (< 3s, sans I/O Discord)", async () => {
    const app = await createApiServer({ statsProvider: offlineProvider });
    const start = performance.now();
    const res = await app.inject({ method: "GET", url: "/health" });
    const elapsed = performance.now() - start;
    expect(res.statusCode).toBe(200);
    expect(elapsed).toBeLessThan(3000);
    await app.close();
  });

  it("GET /stats retourne un objet JSON", async () => {
    const app = await createApiServer({ statsProvider: offlineProvider });
    const res = await app.inject({ method: "GET", url: "/stats" });
    expect(res.statusCode).toBe(200);
    const body: unknown = res.json();
    expect(typeof body).toBe("object");
    expect(body).not.toBeNull();
    expect(Array.isArray(body)).toBe(false);
    await app.close();
  });

  it("GET /stats expose guildCount et userCount typage number (noms du contrat)", async () => {
    const app = await createApiServer({ statsProvider: offlineProvider });
    const res = await app.inject({ method: "GET", url: "/stats" });
    const body = res.json() as Record<string, unknown>;
    // Le contrat impose les noms guildCount / userCount (PAS guilds / users).
    expect(typeof body["guildCount"]).toBe("number");
    expect(typeof body["userCount"]).toBe("number");
    await app.close();
  });
});
