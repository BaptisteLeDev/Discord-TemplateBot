/**
 * Commande /ping — tracer bullet de bout en bout, EXEMPLE VIVANT du socle. Copier ce
 * fichier (et son test colocalise) pour ajouter une commande.
 *
 * Consomme le socle : resout la locale (via `resoudreContexteCommande`), rend le message
 * depuis le catalogue type, et repond un embed THEME avec la couleur de la guilde. La
 * commande ne connait ni la charte, ni la source des reglages : tout arrive par injection.
 */
import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { CATALOGUE } from "../i18n/catalog";
import { localisations } from "../i18n/localizations";
import { resoudreContexteCommande } from "./contexte";
import type { Command, CommandeDeps } from "./types";

export function creerPingCommand(deps: CommandeDeps): Command {
  const { settingsStore, embedFactory } = deps;

  return {
    data: new SlashCommandBuilder()
      .setName("ping")
      .setDescription(CATALOGUE.fr.ping.description)
      .setDescriptionLocalizations(localisations((x) => x.ping.description)),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
      const { messages, settings } = await resoudreContexteCommande(interaction, settingsStore);
      const latence = Math.max(0, Math.round(interaction.client.ws.ping));
      const embed = embedFactory({ couleurGuilde: settings.embedColor }).setDescription(
        messages.ping.reponse({ latence }),
      );
      await interaction.reply({ embeds: [embed] });
    },
  };
}
