/**
 * Socle de robustesse du routeur d'interactions (herite par les 4 bots derives).
 *
 * On construit un VRAI BotClient (sans login Discord) et on exerce le routage via un
 * double structurel d'interaction. Deux invariants de flotte :
 *   - le client neutralise les mentions par defaut (pas de ping @everyone/role) ;
 *   - un feedback d'erreur qui echoue (interaction expiree/deja acquittee) ne remonte
 *     jamais en rejet non gere.
 */
import { describe, expect, it, spyOn } from "bun:test";
import { BotClient } from "./client";

type Routeur = { handleInteraction(interaction: unknown): Promise<void> };

function fakeChatInput(opts: {
  replied?: boolean;
  deferred?: boolean;
  onReponse: () => Promise<unknown>;
}) {
  return {
    isAutocomplete: () => false,
    isChatInputCommand: () => true,
    commandName: "boom",
    replied: opts.replied ?? false,
    deferred: opts.deferred ?? false,
    reply: opts.onReponse,
    followUp: opts.onReponse,
  };
}

describe("BotClient — socle de robustesse", () => {
  it("pose allowedMentions neutre (pas de ping @everyone/role par defaut)", () => {
    const client = new BotClient();
    expect(client.options.allowedMentions).toEqual({ parse: [], repliedUser: false });
  });

  it("un feedback d'erreur qui echoue (interaction expiree) ne rejette pas le routeur", async () => {
    const errSpy = spyOn(console, "error").mockImplementation(() => {});
    const client = new BotClient();
    client.commands.set("boom", {
      data: { name: "boom" } as never,
      execute: async () => {
        throw new Error("execute a explose");
      },
    });
    const interaction = fakeChatInput({
      replied: true,
      onReponse: () => Promise.reject(new Error("Unknown interaction (10062)")),
    });

    const routeur = client as unknown as Routeur;
    await expect(routeur.handleInteraction(interaction)).resolves.toBeUndefined();
    errSpy.mockRestore();
  });
});
