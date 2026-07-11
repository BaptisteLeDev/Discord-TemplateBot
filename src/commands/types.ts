/**
 * Type d'une commande slash : un descripteur (schema) + un handler d'execution.
 *
 * Les commandes sont des ADAPTERS Discord : elles traduisent une interaction vers
 * le domaine pur (src/domain) et reposent le resultat. Elles ne portent pas de
 * logique metier elles-memes.
 */
import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import type { GuildSettingsStore } from "../guildsettings/store";
import type { EmbedThemé } from "../theming/embed";

export type CommandData =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder;

export interface Command {
  data: CommandData;
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
  /** Optionnel : autocompletion d'une option. */
  autocomplete?(interaction: AutocompleteInteraction): Promise<void>;
}

/**
 * Dependances injectees aux commandes a la composition (socle de flotte) : source des
 * reglages par guilde et fabrique d'embeds themes. Une commande consomme le socle via
 * ces ports, jamais via une source brute (mandat ARCHITECTURE.md).
 */
export interface CommandeDeps {
  readonly settingsStore: GuildSettingsStore;
  readonly embedFactory: EmbedThemé;
}
