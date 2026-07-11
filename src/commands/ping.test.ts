/**
 * Test d'acceptation de /ping (tracer bullet), MIS A JOUR pour le socle : /ping est
 * desormais une fabrique qui consomme le socle (locale resolue -> message du catalogue,
 * embed theme avec la couleur de la guilde). On injecte un double structurel
 * d'interaction et les ports en memoire (frontiere I/O reelle, pas mock).
 */
import { describe, expect, it } from "bun:test";
import { creerPingCommand } from "./ping";
import { parseEmbedColor } from "../domain/embed-color";
import { creerMemoryGuildSettingsStore } from "../guildsettings/memory-store";
import { creerEmbedFactory } from "../theming/embed";
import { THEME_DEFAUT } from "../theming/theme";
import type { GuildSettingsStore } from "../guildsettings/store";

function creerCommande(store: GuildSettingsStore = creerMemoryGuildSettingsStore()) {
  return creerPingCommand({ settingsStore: store, embedFactory: creerEmbedFactory(THEME_DEFAUT) });
}

function fakeInteraction(opts: { discordLocale?: string; ping?: number } = {}) {
  const replies: { embeds?: { data: { description?: string; color?: number } }[] }[] = [];
  return {
    replies,
    interaction: {
      guildId: "g1",
      guild: { preferredLocale: opts.discordLocale ?? "fr" },
      locale: opts.discordLocale ?? "fr",
      client: { ws: { ping: opts.ping ?? 42 } },
      reply: (payload: { embeds?: { data: { description?: string; color?: number } }[] }) => {
        replies.push(payload);
        return Promise.resolve();
      },
    },
  };
}

describe("commande /ping", () => {
  it('se nomme "ping" et a une description', () => {
    const cmd = creerCommande();
    expect(cmd.data.name).toBe("ping");
    expect(cmd.data.description.length).toBeGreaterThan(0);
  });

  it("repond un embed contenant Pong et la latence (locale FR par defaut)", async () => {
    const { interaction, replies } = fakeInteraction({ ping: 42 });
    await creerCommande().execute(interaction as never);
    const desc = replies[0]?.embeds?.[0]?.data.description ?? "";
    expect(desc).toContain("Pong");
    expect(desc).toContain("42");
  });

  it("localise la reponse selon la locale Discord de la guilde", async () => {
    const { interaction, replies } = fakeInteraction({ discordLocale: "en-US" });
    await creerCommande().execute(interaction as never);
    expect(replies[0]?.embeds?.[0]?.data.description ?? "").toContain("Latency");
  });

  it("teinte l'embed avec la couleur configuree de la guilde", async () => {
    const store = creerMemoryGuildSettingsStore();
    await store.setEmbedColor("g1", parseEmbedColor(0xff0000)!);
    const { interaction, replies } = fakeInteraction();
    await creerCommande(store).execute(interaction as never);
    expect(replies[0]?.embeds?.[0]?.data.color).toBe(0xff0000);
  });
});
