/**
 * Registre des commandes slash. Toute nouvelle commande s'ajoute ici.
 *
 * Fabrique a INJECTION : chaque commande est une fabrique qui recoit le socle
 * (`CommandeDeps` : store de reglages + fabrique d'embeds). `creerDepsParDefaut`
 * fournit la composition par defaut (store memoire cache + theme du bot), surchargée
 * a la racine (client.ts / index.ts) pour brancher Neon quand `DATABASE_URL` existe.
 */
import { creerPingCommand } from "./ping";
import { creerConfigCommand } from "./config";
import type { Command, CommandeDeps } from "./types";
import { creerMemoryGuildSettingsStore } from "../guildsettings/memory-store";
import { creerCachedGuildSettingsStore } from "../guildsettings/cached-store";
import type { GuildSettingsStore } from "../guildsettings/store";
import { creerEmbedFactory } from "../theming/embed";
import { THEME_DEFAUT, type Theme } from "../theming/theme";

/**
 * Compose les dependances par defaut du gabarit : store en memoire (cache) et fabrique
 * d'embeds du theme. En prod, injecter un `settingsStore` drizzle deja construit.
 */
export function creerDepsParDefaut(
  options: { settingsStore?: GuildSettingsStore | undefined; theme?: Theme | undefined } = {},
): CommandeDeps {
  const theme = options.theme ?? THEME_DEFAUT;
  const settingsStore =
    options.settingsStore ?? creerCachedGuildSettingsStore(creerMemoryGuildSettingsStore());
  return { settingsStore, embedFactory: creerEmbedFactory(theme) };
}

export function creerCommandes(deps: CommandeDeps = creerDepsParDefaut()): Command[] {
  return [creerPingCommand(deps), creerConfigCommand(deps)];
}
