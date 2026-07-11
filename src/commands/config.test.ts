/**
 * Commande /config (#socle) : admin ManageGuild, reponses ephemeres, validation par VO.
 * On teste l'adapter sans vraie interaction Discord en injectant un double structurel
 * de ChatInputCommandInteraction et un store en memoire (frontiere I/O reelle, pas mock).
 */
import { describe, expect, it } from "bun:test";
import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { creerConfigCommand } from "./config";
import { fr } from "../i18n/catalog";
import { parseEmbedColor } from "../domain/embed-color";
import { creerMemoryGuildSettingsStore } from "../guildsettings/memory-store";
import { creerEmbedFactory } from "../theming/embed";
import { THEME_DEFAUT } from "../theming/theme";
import type { GuildSettingsStore } from "../guildsettings/store";

interface OptionsFake {
  sub: string;
  strings?: Record<string, string>;
  manageGuild?: boolean;
  guildId?: string | null;
  discordLocale?: string;
}

function fakeInteraction(opts: OptionsFake) {
  // La reponse est TOUJOURS differee en ephemere puis servie par editReply (convention
  // T3). On collecte les editReply dans `replies` et on expose le flag de defer.
  const replies: { content?: string; flags?: number; embeds?: unknown[] }[] = [];
  const guildId = opts.guildId === undefined ? "g1" : opts.guildId;
  let deferFlags: number | undefined;
  return {
    replies,
    getDeferFlags: () => deferFlags,
    interaction: {
      guildId,
      guild: guildId ? { preferredLocale: opts.discordLocale ?? "fr" } : null,
      locale: opts.discordLocale ?? "fr",
      inGuild: () => guildId !== null,
      memberPermissions: { has: (_flag: bigint) => opts.manageGuild ?? true },
      options: {
        getSubcommand: () => opts.sub,
        getString: (name: string) => opts.strings?.[name] ?? null,
      },
      deferReply: (payload?: { flags?: number }) => {
        deferFlags = payload?.flags;
        return Promise.resolve();
      },
      editReply: (payload: { content?: string; embeds?: unknown[] }) => {
        replies.push(payload);
        return Promise.resolve();
      },
    },
  };
}

function creerCommande(store: GuildSettingsStore) {
  return creerConfigCommand({
    settingsStore: store,
    embedFactory: creerEmbedFactory(THEME_DEFAUT),
  });
}

describe("commande /config — convention deferReply (T3)", () => {
  it("diffère la réponse en ephemere AVANT toute lecture DB, puis editReply", async () => {
    const journal: string[] = [];
    const base = creerMemoryGuildSettingsStore();
    const store: GuildSettingsStore = {
      get: async (id) => {
        journal.push("db:get");
        return base.get(id);
      },
      setLocale: (id, l) => base.setLocale(id, l),
      setEmbedColor: (id, c) => base.setEmbedColor(id, c),
    };
    let deferFlags: number | undefined;
    const editReplies: unknown[] = [];
    const interaction = {
      guildId: "g1",
      guild: { preferredLocale: "fr" },
      locale: "fr",
      inGuild: () => true,
      memberPermissions: { has: () => true },
      options: { getSubcommand: () => "afficher", getString: () => null },
      deferReply: (payload?: { flags?: number }) => {
        journal.push("defer");
        deferFlags = payload?.flags;
        return Promise.resolve();
      },
      editReply: (payload: unknown) => {
        journal.push("edit");
        editReplies.push(payload);
        return Promise.resolve();
      },
      reply: () => {
        journal.push("reply");
        return Promise.resolve();
      },
    };

    await creerCommande(store).execute(interaction as never);

    expect(journal.indexOf("defer")).toBeGreaterThanOrEqual(0);
    expect(journal.indexOf("defer")).toBeLessThan(journal.indexOf("db:get"));
    expect(deferFlags).toBe(MessageFlags.Ephemeral);
    expect(journal).not.toContain("reply");
    expect(editReplies.length).toBeGreaterThan(0);
  });
});

describe("commande /config — schema", () => {
  it("se nomme config, a une description et exige ManageGuild", () => {
    const cmd = creerCommande(creerMemoryGuildSettingsStore());
    const json = cmd.data.toJSON();
    expect(json.name).toBe("config");
    expect(json.description.length).toBeGreaterThan(0);
    expect(json.default_member_permissions).toBe(PermissionFlagsBits.ManageGuild.toString());
  });

  it("declare les sous-commandes langue, couleur, afficher", () => {
    const cmd = creerCommande(creerMemoryGuildSettingsStore());
    const noms = (cmd.data.toJSON().options ?? []).map((o) => o.name);
    expect(noms).toEqual(["langue", "couleur", "afficher"]);
  });
});

describe("commande /config — execution", () => {
  it("langue : persiste l'override et repond en ephemere", async () => {
    const store = creerMemoryGuildSettingsStore();
    const { interaction, replies, getDeferFlags } = fakeInteraction({
      sub: "langue",
      strings: { langue: "en" },
    });
    await creerCommande(store).execute(interaction as never);
    expect((await store.get("g1")).preferredLocale).toBe("en");
    expect(getDeferFlags()).toBe(MessageFlags.Ephemeral);
    expect(replies[0]?.content).toContain("en");
  });

  it("couleur : hex valide persiste la couleur", async () => {
    const store = creerMemoryGuildSettingsStore();
    const { interaction } = fakeInteraction({ sub: "couleur", strings: { valeur: "#ff8800" } });
    await creerCommande(store).execute(interaction as never);
    expect((await store.get("g1")).embedColor).toBe(parseEmbedColor(0xff8800));
  });

  it("couleur : reset efface la couleur", async () => {
    const store = creerMemoryGuildSettingsStore();
    await store.setEmbedColor("g1", parseEmbedColor(0x123456)!);
    const { interaction } = fakeInteraction({ sub: "couleur", strings: { valeur: "reset" } });
    await creerCommande(store).execute(interaction as never);
    expect((await store.get("g1")).embedColor).toBeNull();
  });

  it("couleur : hex invalide ne persiste rien et signale l'erreur", async () => {
    const store = creerMemoryGuildSettingsStore();
    const { interaction, replies, getDeferFlags } = fakeInteraction({
      sub: "couleur",
      strings: { valeur: "pas-une-couleur" },
    });
    await creerCommande(store).execute(interaction as never);
    expect((await store.get("g1")).embedColor).toBeNull();
    expect(getDeferFlags()).toBe(MessageFlags.Ephemeral);
    expect(replies[0]?.content?.length ?? 0).toBeGreaterThan(0);
  });

  it("langue : valeur invalide signale une erreur de LANGUE (pas de couleur)", async () => {
    const store = creerMemoryGuildSettingsStore();
    const { interaction, replies } = fakeInteraction({ sub: "langue", strings: { langue: "xx" } });
    await creerCommande(store).execute(interaction as never);
    expect((await store.get("g1")).preferredLocale).toBeNull();
    expect(replies[0]?.content).toBe(fr.config.langue.invalide);
    expect(replies[0]?.content).not.toBe(fr.config.couleur.invalide);
  });

  it("refuse l'execution sans permission ManageGuild (defense en profondeur)", async () => {
    const store = creerMemoryGuildSettingsStore();
    const { interaction, replies, getDeferFlags } = fakeInteraction({
      sub: "langue",
      strings: { langue: "en" },
      manageGuild: false,
    });
    await creerCommande(store).execute(interaction as never);
    expect((await store.get("g1")).preferredLocale).toBeNull();
    expect(getDeferFlags()).toBe(MessageFlags.Ephemeral);
    expect(replies[0]?.content).toBe(fr.config.permissionRefusee);
  });

  it("afficher : repond un embed ephemere", async () => {
    const store = creerMemoryGuildSettingsStore();
    const { interaction, replies, getDeferFlags } = fakeInteraction({ sub: "afficher" });
    await creerCommande(store).execute(interaction as never);
    expect(getDeferFlags()).toBe(MessageFlags.Ephemeral);
    expect(replies[0]?.embeds?.length).toBe(1);
  });
});
