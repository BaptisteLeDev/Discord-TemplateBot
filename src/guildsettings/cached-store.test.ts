/**
 * Le decorateur de cache doit (1) honorer le contrat du port a l'identique, et (2)
 * reduire les lectures de l'adapter sous-jacent : cache par guilde, TTL borne, et
 * ecritures write-through (set met le cache a jour, pas de relecture immediate).
 *
 * Hypothese mono-process (D14) : cache in-process coherent ; le TTL borne la staleness.
 */
import { describe, expect, it } from "bun:test";
import { parseEmbedColor } from "../domain/embed-color";
import { contratGuildSettingsStore } from "./store.contract";
import { creerCachedGuildSettingsStore } from "./cached-store";
import { creerMemoryGuildSettingsStore } from "./memory-store";
import type { GuildSettingsStore } from "./store";

contratGuildSettingsStore("cache(memory)", async () =>
  creerCachedGuildSettingsStore(creerMemoryGuildSettingsStore()),
);

/** Enveloppe comptant les appels a `get` de l'adapter sous-jacent. */
function storeEspion(): { store: GuildSettingsStore; lectures: () => number } {
  const inner = creerMemoryGuildSettingsStore();
  let n = 0;
  return {
    lectures: () => n,
    store: {
      async get(guildId) {
        n += 1;
        return inner.get(guildId);
      },
      setLocale: (g, l) => inner.setLocale(g, l),
      setEmbedColor: (g, c) => inner.setEmbedColor(g, c),
    },
  };
}

describe("cached-store (comportement de cache)", () => {
  it("sert la 2e lecture depuis le cache (une seule lecture inner)", async () => {
    const espion = storeEspion();
    const cache = creerCachedGuildSettingsStore(espion.store);
    await cache.get("g1");
    await cache.get("g1");
    expect(espion.lectures()).toBe(1);
  });

  it("write-invalidate : un set invalide le cache, la lecture suivante recharge l'inner", async () => {
    const espion = storeEspion();
    const cache = creerCachedGuildSettingsStore(espion.store);
    await cache.setLocale("g1", "en");
    expect((await cache.get("g1")).preferredLocale).toBe("en");
    expect(espion.lectures()).toBe(1);
  });

  it("relit l'inner apres expiration du TTL", async () => {
    const espion = storeEspion();
    let horloge = 1000;
    const cache = creerCachedGuildSettingsStore(espion.store, {
      ttlMs: 60_000,
      maintenant: () => horloge,
    });
    await cache.get("g1");
    horloge += 60_001;
    await cache.get("g1");
    expect(espion.lectures()).toBe(2);
  });

  it("un set ne doit pas effacer l'autre champ deja persiste (cache froid)", async () => {
    const espion = storeEspion();
    const bleu = parseEmbedColor(0x0000ff)!;
    await espion.store.setEmbedColor("g1", bleu); // deja en DB, cache jamais chauffe
    const cache = creerCachedGuildSettingsStore(espion.store);
    await cache.setLocale("g1", "en"); // set de l'AUTRE champ, cache froid
    const settings = await cache.get("g1");
    expect(settings.preferredLocale).toBe("en");
    expect(settings.embedColor).toBe(bleu);
  });

  it("invalide par guilde independamment", async () => {
    const espion = storeEspion();
    const cache = creerCachedGuildSettingsStore(espion.store);
    const bleu = parseEmbedColor(0x000088)!;
    await cache.setEmbedColor("g1", bleu);
    expect((await cache.get("g1")).embedColor).toBe(bleu);
    expect((await cache.get("g2")).embedColor).toBeNull();
    expect(espion.lectures()).toBe(2); // g1 (recharge post-invalidation) + g2 (miss)
  });
});
