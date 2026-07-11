/**
 * Garde de point d'entree (socle de flotte). Lance une fonction async de demarrage
 * (`bootstrap`, `deploy`) en transformant tout rejet en echec ACTIONNABLE : log + exit
 * non nul. Sans ce garde, `void fn()` laisse un rejet devenir un `unhandledRejection`
 * muet (bruit sous Bun, crash possible sous Node) sans code de sortie exploitable.
 *
 * `exit`/`log` sont injectables pour tester le comportement sans tuer le process.
 */
export interface EntrypointDeps {
  exit?: (code: number) => void;
  log?: (...args: unknown[]) => void;
}

export async function executerAuDemarrage(
  label: string,
  fn: () => Promise<void>,
  deps: EntrypointDeps = {},
): Promise<void> {
  const exit = deps.exit ?? ((code: number) => process.exit(code));
  const log = deps.log ?? ((...args: unknown[]) => console.error(...args));
  try {
    await fn();
  } catch (err) {
    log(`Echec au demarrage (${label}) :`, err);
    exit(1);
  }
}
