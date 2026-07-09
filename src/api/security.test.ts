/**
 * Durcissement de l'API monitoring — socle de flotte (issue #15).
 *
 * Le gabarit est la base dont dérivent tous les bots : ce que ce fichier verrouille
 * ici s'applique à toute la flotte. On encode le contrat de sécurité :
 *   - /stats et / exigent un Bearer quand un `statsToken` est configuré ;
 *   - /health reste PUBLIC (invariant du contrat monitoring) ;
 *   - CORS fermé par défaut (pas de reflet d'origine) ;
 *   - un bind non-loopback SANS token refuse le boot (deny-by-default).
 */
import { describe, expect, it } from "bun:test";
import { createApiServer } from "./server";
import { loadConfig } from "../config";
import type { StatsProvider } from "./stats-provider";

const provider: StatsProvider = {
  getStats: () => ({
    guildCount: 0,
    userCount: 0,
    commandsToday: 0,
    discordLatencyMs: -1,
    version: "0.0.0",
  }),
};

const TOKEN = "s3cr3t-monitoring-token";

describe("API monitoring durcie (#15)", () => {
  it("/stats répond 401 sans Authorization quand un token est configuré", async () => {
    const app = await createApiServer({ statsProvider: provider, statsToken: TOKEN });
    const res = await app.inject({ method: "GET", url: "/stats" });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("/stats répond 401 avec un mauvais token", async () => {
    const app = await createApiServer({ statsProvider: provider, statsToken: TOKEN });
    const res = await app.inject({
      method: "GET",
      url: "/stats",
      headers: { authorization: "Bearer mauvais" },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("/stats répond 200 avec le bon Bearer", async () => {
    const app = await createApiServer({ statsProvider: provider, statsToken: TOKEN });
    const res = await app.inject({
      method: "GET",
      url: "/stats",
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as Record<string, unknown>)["guildCount"]).toBe(0);
    await app.close();
  });

  it("/health reste PUBLIC même avec un token configuré", async () => {
    const app = await createApiServer({ statsProvider: provider, statsToken: TOKEN });
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it("CORS n'est pas ouvert par défaut (pas de reflet d'origine)", async () => {
    const app = await createApiServer({ statsProvider: provider });
    const res = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "https://evil.example" },
    });
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    await app.close();
  });

  it("loadConfig REFUSE le boot si bind non-loopback sans STATS_TOKEN (deny-by-default)", () => {
    expect(() =>
      loadConfig({
        DISCORD_TOKEN: "x",
        DISCORD_APPLICATION_ID: "y",
        HOST: "0.0.0.0",
      } as NodeJS.ProcessEnv),
    ).toThrow();
  });

  it("HOST défaut = loopback (127.0.0.1)", () => {
    const cfg = loadConfig({
      DISCORD_TOKEN: "x",
      DISCORD_APPLICATION_ID: "y",
    } as NodeJS.ProcessEnv);
    expect(cfg.api.host).toBe("127.0.0.1");
  });

  it("bind non-loopback AVEC STATS_TOKEN est autorisé", () => {
    const cfg = loadConfig({
      DISCORD_TOKEN: "x",
      DISCORD_APPLICATION_ID: "y",
      HOST: "0.0.0.0",
      STATS_TOKEN: TOKEN,
    } as NodeJS.ProcessEnv);
    expect(cfg.api.host).toBe("0.0.0.0");
    expect(cfg.api.statsToken).toBe(TOKEN);
  });
});
