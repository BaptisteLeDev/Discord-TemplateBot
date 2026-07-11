/**
 * Contexte de commande (#socle) : le motif de consommation du socle que TOUTE commande
 * copie. Depuis une interaction + le store de reglages, resout la locale effective
 * (override /config > locale Discord > FR), le jeu de messages type, et les reglages
 * de la guilde (couleur). Centralise ce branchement pour ne pas le dupliquer par commande.
 *
 * ADAPTER (touche discord.js) : traduit la locale Discord via `mapperDiscordLocale`,
 * puis delegue la decision au domaine pur `resoudreLocale`.
 */
import type { ChatInputCommandInteraction } from "discord.js";
import type { LocaleTag } from "../domain/locale";
import { resoudreLocale } from "../domain/locale-resolution";
import { mapperDiscordLocale } from "../i18n/discord-locale";
import { t } from "../i18n/t";
import type { Messages } from "../i18n/catalog";
import {
  REGLAGES_DEFAUT,
  type GuildSettings,
  type GuildSettingsStore,
} from "../guildsettings/store";

export interface ContexteCommande {
  readonly locale: LocaleTag;
  readonly messages: Messages;
  readonly settings: GuildSettings;
}

export async function resoudreContexteCommande(
  interaction: ChatInputCommandInteraction,
  settingsStore: GuildSettingsStore,
): Promise<ContexteCommande> {
  const settings = interaction.guildId
    ? await settingsStore.get(interaction.guildId)
    : REGLAGES_DEFAUT;
  const localeGuildeDiscord = mapperDiscordLocale(
    interaction.guild?.preferredLocale ?? interaction.locale,
  );
  const locale = resoudreLocale({
    overrideGuild: settings.preferredLocale,
    localeGuildeDiscord,
  });
  return { locale, messages: t(locale), settings };
}
