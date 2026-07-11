/**
 * Tests de CONTRAT du port GuildSettingsStore (#socle) : une seule suite executee
 * contre CHAQUE adapter (memoire, cache(memoire), drizzle/pg-mem). Tout adapter qui
 * passe est une source de reglages interchangeable.
 *
 * Invariant central : `get()` ne renvoie JAMAIS null -> le consommateur ne branche
 * jamais sur l'absence, il lit des defauts (`preferredLocale:null, embedColor:null`).
 */
import { describe, expect, it } from "bun:test";
import { parseEmbedColor } from "../domain/embed-color";
import type { GuildSettingsStore } from "./store";

const BLURPLE = parseEmbedColor(0x5865f2)!;

export function contratGuildSettingsStore(
  nom: string,
  creer: () => Promise<GuildSettingsStore>,
): void {
  describe(`GuildSettingsStore — contrat (${nom})`, () => {
    it("get -> defauts (null/null) pour une guilde jamais configuree", async () => {
      const store = await creer();
      expect(await store.get("g1")).toEqual({ preferredLocale: null, embedColor: null });
    });

    it("setLocale persiste l'override et get le relit", async () => {
      const store = await creer();
      await store.setLocale("g1", "en");
      expect((await store.get("g1")).preferredLocale).toBe("en");
    });

    it("setEmbedColor persiste la couleur et get la relit", async () => {
      const store = await creer();
      await store.setEmbedColor("g1", BLURPLE);
      expect((await store.get("g1")).embedColor).toBe(BLURPLE);
    });

    it("setLocale et setEmbedColor sont des patchs independants", async () => {
      const store = await creer();
      await store.setLocale("g1", "en");
      await store.setEmbedColor("g1", BLURPLE);
      expect(await store.get("g1")).toEqual({ preferredLocale: "en", embedColor: BLURPLE });
    });

    it("setLocale(null) efface l'override sans toucher la couleur", async () => {
      const store = await creer();
      await store.setLocale("g1", "en");
      await store.setEmbedColor("g1", BLURPLE);
      await store.setLocale("g1", null);
      expect(await store.get("g1")).toEqual({ preferredLocale: null, embedColor: BLURPLE });
    });

    it("setEmbedColor(null) efface la couleur sans toucher la langue", async () => {
      const store = await creer();
      await store.setLocale("g1", "fr");
      await store.setEmbedColor("g1", BLURPLE);
      await store.setEmbedColor("g1", null);
      expect(await store.get("g1")).toEqual({ preferredLocale: "fr", embedColor: null });
    });

    it("isole les guildes entre elles", async () => {
      const store = await creer();
      await store.setLocale("g1", "en");
      expect(await store.get("g2")).toEqual({ preferredLocale: null, embedColor: null });
    });
  });
}
