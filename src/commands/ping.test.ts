/**
 * Test d'acceptation de la commande /ping (tracer bullet).
 *
 * La commande declare son schema (nom + description) et, a l'execution, repond
 * un message contenant "Pong". On teste l'adapter sans vraie interaction Discord
 * en injectant un double minimal de ChatInputCommandInteraction (reply capture).
 */
import { describe, expect, it } from "bun:test";
import { pingCommand } from "./ping";

describe("commande /ping", () => {
  it('se nomme "ping" et a une description', () => {
    expect(pingCommand.data.name).toBe("ping");
    expect(pingCommand.data.description.length).toBeGreaterThan(0);
  });

  it('repond un message contenant "Pong"', async () => {
    let replied = "";
    const fakeInteraction = {
      isChatInputCommand: () => true,
      client: { ws: { ping: 42 } },
      reply: (content: string) => {
        replied = content;
        return Promise.resolve();
      },
    };
    // L'adapter accepte une interaction structurellement compatible.
    await pingCommand.execute(fakeInteraction as never);
    expect(replied).toContain("Pong");
  });
});
