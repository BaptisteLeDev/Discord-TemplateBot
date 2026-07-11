/**
 * Commande /config (#socle) : personnalisation du bot PAR SERVEUR (langue, couleur).
 *
 * Securite en profondeur : `setDefaultMemberPermissions(ManageGuild)` cache la commande
 * aux non-admins cote Discord, ET `execute` REVALIDE la permission (un client modifie ou
 * une mauvaise config de roles ne doit pas contourner le controle). Reponses ephemeres :
 * la config n'a pas a polluer le salon. Validation par VO (parseLocale/parseEmbedColor).
 *
 * ADAPTER : traduit l'interaction vers les ports (settingsStore) et les VO du domaine ;
 * ne porte aucune regle metier propre.
 */
import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { parseLocale, LOCALES } from "../domain/locale";
import { parseEmbedColor } from "../domain/embed-color";
import { CATALOGUE } from "../i18n/catalog";
import { localisations } from "../i18n/localizations";
import { resoudreContexteCommande } from "./contexte";
import type { Command, CommandeDeps } from "./types";

const SOUS_LANGUE = "langue";
const SOUS_COULEUR = "couleur";
const SOUS_AFFICHER = "afficher";
const OPTION_LANGUE = "langue";
const OPTION_VALEUR = "valeur";
const RESET = "reset";

/** Descripteur de la commande : nom stable (non localise), descriptions localisees. */
function construireData(): SlashCommandBuilder {
  const m = CATALOGUE.fr;
  const builder = new SlashCommandBuilder()
    .setName("config")
    .setDescription(m.config.commandeDescription)
    .setDescriptionLocalizations(localisations((x) => x.config.commandeDescription))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

  builder.addSubcommand((sc) =>
    sc
      .setName(SOUS_LANGUE)
      .setDescription(m.config.langue.sousCommandeDescription)
      .setDescriptionLocalizations(localisations((x) => x.config.langue.sousCommandeDescription))
      .addStringOption((opt) =>
        opt
          .setName(OPTION_LANGUE)
          .setDescription(m.config.langue.optionDescription)
          .setDescriptionLocalizations(localisations((x) => x.config.langue.optionDescription))
          .setRequired(true)
          .addChoices(...LOCALES.map((l) => ({ name: l, value: l }))),
      ),
  );

  builder.addSubcommand((sc) =>
    sc
      .setName(SOUS_COULEUR)
      .setDescription(m.config.couleur.sousCommandeDescription)
      .setDescriptionLocalizations(localisations((x) => x.config.couleur.sousCommandeDescription))
      .addStringOption((opt) =>
        opt
          .setName(OPTION_VALEUR)
          .setDescription(m.config.couleur.optionDescription)
          .setDescriptionLocalizations(localisations((x) => x.config.couleur.optionDescription))
          .setRequired(true),
      ),
  );

  builder.addSubcommand((sc) =>
    sc
      .setName(SOUS_AFFICHER)
      .setDescription(m.config.afficher.sousCommandeDescription)
      .setDescriptionLocalizations(localisations((x) => x.config.afficher.sousCommandeDescription)),
  );

  return builder;
}

export function creerConfigCommand(deps: CommandeDeps): Command {
  const { settingsStore, embedFactory } = deps;

  return {
    data: construireData(),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
      // CONVENTION SOCLE (T3) que les bots derives copient : une lecture DB (resolution
      // du contexte + reglages, puis les upserts) precede toute reponse. On DIFFERE en
      // ephemere DES LE DEBUT — sinon, sur cold-start Neon (> 3 s), l'ack slash de 3 s
      // expirerait et le premier reply echouerait. Ensuite on repond via `editReply`
      // (jamais `reply`), la reponse etant deja acquittee et deja ephemere.
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const { messages } = await resoudreContexteCommande(interaction, settingsStore);

      const guildId = interaction.guildId;
      if (guildId === null) {
        await interaction.editReply({ content: messages.config.horsServeur });
        return;
      }
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.editReply({ content: messages.config.permissionRefusee });
        return;
      }

      const sousCommande = interaction.options.getSubcommand();
      if (sousCommande === SOUS_LANGUE) {
        await executerLangue(interaction, guildId, messages, settingsStore);
        return;
      }
      if (sousCommande === SOUS_COULEUR) {
        await executerCouleur(interaction, guildId, messages, settingsStore);
        return;
      }
      await executerAfficher(interaction, guildId, messages, settingsStore, embedFactory);
    },
  };
}

async function executerLangue(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  messages: (typeof CATALOGUE)["fr"],
  store: CommandeDeps["settingsStore"],
): Promise<void> {
  const valeur = interaction.options.getString(OPTION_LANGUE, true);
  const locale = parseLocale(valeur);
  if (locale === null) {
    await interaction.editReply({ content: messages.config.langue.invalide });
    return;
  }
  await store.setLocale(guildId, locale);
  await interaction.editReply({ content: messages.config.langue.definie({ locale }) });
}

async function executerCouleur(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  messages: (typeof CATALOGUE)["fr"],
  store: CommandeDeps["settingsStore"],
): Promise<void> {
  const valeur = interaction.options.getString(OPTION_VALEUR, true).trim();
  if (valeur.toLowerCase() === RESET) {
    await store.setEmbedColor(guildId, null);
    await interaction.editReply({ content: messages.config.couleur.reinitialisee });
    return;
  }
  const couleur = parseEmbedColor(valeur);
  if (couleur === null) {
    await interaction.editReply({ content: messages.config.couleur.invalide });
    return;
  }
  await store.setEmbedColor(guildId, couleur);
  await interaction.editReply({ content: messages.config.couleur.definie({ couleur: valeur }) });
}

async function executerAfficher(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  messages: (typeof CATALOGUE)["fr"],
  store: CommandeDeps["settingsStore"],
  embedFactory: CommandeDeps["embedFactory"],
): Promise<void> {
  const settings = await store.get(guildId);
  const embed = embedFactory({ couleurGuilde: settings.embedColor })
    .setTitle(messages.config.afficher.titre)
    .addFields(
      {
        name: messages.config.afficher.champLangue,
        value: settings.preferredLocale ?? messages.config.afficher.valeurDefaut,
      },
      {
        name: messages.config.afficher.champCouleur,
        value:
          settings.embedColor === null
            ? messages.config.afficher.valeurDefaut
            : `#${settings.embedColor.toString(16).padStart(6, "0")}`,
      },
    );
  await interaction.editReply({ embeds: [embed] });
}
