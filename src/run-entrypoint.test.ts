/**
 * Socle de flotte : tout point d'entree (`index.ts`, `deploy-commands.ts`) lance sa
 * fonction async via ce garde. Un rejet ne doit jamais devenir un `unhandledRejection`
 * muet : il est loggue ET provoque un exit non nul actionnable.
 */
import { describe, expect, it } from "bun:test";
import { executerAuDemarrage } from "./run-entrypoint";

describe("executerAuDemarrage", () => {
  it("n'appelle pas exit quand la fonction reussit", async () => {
    let code: number | undefined;
    const logs: unknown[][] = [];
    await executerAuDemarrage("test", async () => {}, {
      exit: (c) => {
        code = c;
      },
      log: (...a) => logs.push(a),
    });
    expect(code).toBeUndefined();
    expect(logs).toEqual([]);
  });

  it("logge et exit(1) quand la fonction rejette (pas d'unhandledRejection)", async () => {
    let code: number | undefined;
    const logs: unknown[][] = [];
    await executerAuDemarrage(
      "test",
      async () => {
        throw new Error("boom");
      },
      {
        exit: (c) => {
          code = c;
        },
        log: (...a) => logs.push(a),
      },
    );
    expect(code).toBe(1);
    expect(logs.length).toBe(1);
  });
});
