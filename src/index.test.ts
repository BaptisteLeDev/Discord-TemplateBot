/**
 * Bootstrap du gabarit (socle de flotte). On teste l'ORCHESTRATION par injection de
 * doubles, sans reseau Discord ni DB reelle :
 *   - #3 API D'ABORD : l'API ecoute AVANT toute I/O DB (migration).
 *   - #3 migration NON fatale : un echec DB degrade vers le store memoire, l'API reste up.
 *   - #4 pool ferme : le cleanup ferme le store (drainage des connexions Neon).
 *   - #6 shutdown idempotent : un second signal ne relance pas le cleanup.
 */
import { describe, expect, it, spyOn } from "bun:test";
import {
  bootstrap,
  creerSettingsStore,
  creerShutdown,
  type BotLike,
  type StoreOuvert,
} from "./index";
import type { Config } from "./config";

function configFake(databaseUrl?: string): Config {
  return {
    discord: { token: "t", applicationId: "a", guildId: undefined },
    api: { port: 0, host: "127.0.0.1", statsToken: undefined, corsOrigins: [] },
    databaseUrl,
    env: "test",
    isDevelopment: false,
    isProduction: false,
    isTest: true,
  };
}

function botFake(): BotLike & { branche: unknown[] } {
  return {
    branche: [],
    brancherCommandes(store) {
      this.branche.push(store);
    },
    start: async () => {},
    destroy: async () => {},
    getStats: () => ({
      guildCount: 0,
      userCount: 0,
      commandsToday: 0,
      discordLatencyMs: -1,
      version: "0",
    }),
  };
}

describe("creerSettingsStore — migration non fatale (#3)", () => {
  it("degrade vers la memoire (et logge un warn) si la migration echoue", async () => {
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    const ouvert = await creerSettingsStore("postgres://x", {
      migrer: async () => {
        throw new Error("Neon indisponible");
      },
    });
    // Le store degrade fonctionne (defauts lisibles), le boot n'a pas jete.
    expect(await ouvert.store.get("g1")).toEqual({ preferredLocale: null, embedColor: null });
    expect(warn).toHaveBeenCalled();
    await ouvert.fermer();
    warn.mockRestore();
  });
});

describe("bootstrap — ordre et cleanup (#3, #4)", () => {
  it("demarre l'API AVANT de creer le store, et le cleanup ferme tout", async () => {
    const journal: string[] = [];
    let cleanup: (() => Promise<void>) | undefined;
    const fermerStore = spyOn({ f: async () => {} }, "f");
    const apiClose = spyOn({ f: async () => {} }, "f");
    const bot = botFake();
    const destroy = spyOn(bot, "destroy");

    await bootstrap({
      loadConfig: () => configFake("postgres://x"),
      creerBot: () => bot,
      demarrerApi: async () => {
        journal.push("api:listen");
        return { close: apiClose };
      },
      creerStore: async (): Promise<StoreOuvert> => {
        journal.push("store:creer");
        return { store: bot.getStats as never, fermer: fermerStore };
      },
      brancherSignaux: (c) => {
        cleanup = c;
      },
    });

    expect(journal).toEqual(["api:listen", "store:creer"]);
    await cleanup?.();
    expect(destroy).toHaveBeenCalled();
    expect(apiClose).toHaveBeenCalled();
    expect(fermerStore).toHaveBeenCalled();
  });
});

describe("creerShutdown — idempotence (#6)", () => {
  it("un second signal ne relance pas le cleanup", async () => {
    let appels = 0;
    const codes: number[] = [];
    const shutdown = creerShutdown(
      async () => {
        appels += 1;
      },
      (code) => codes.push(code),
    );
    shutdown("SIGINT");
    shutdown("SIGTERM");
    await new Promise((r) => setTimeout(r, 0));
    expect(appels).toBe(1);
  });
});
