/**
 * Fabrique d'embeds themes (ADAPTER discord.js). Remplace les
 * `new EmbedBuilder().setColor(0x…)` eparpilles par un point unique. Injectee aux
 * commandes a la composition ; celles-ci produisent des embeds coherents (couleur de
 * la guilde ou du theme, footer) sans connaitre la charte.
 *
 * Abstraction MERITEE : centralise le changement de charte (un point) ET empeche une
 * couleur invalide d'atteindre `.setColor` (le type `EmbedColor` ne s'obtient que via
 * `parseEmbedColor`).
 */
import { EmbedBuilder } from "discord.js";
import type { EmbedColor } from "../domain/embed-color";
import type { Theme } from "./theme";

/** Contexte optionnel d'un embed : override de couleur/footer pour une guilde donnee. */
export interface ContexteEmbed {
  couleurGuilde?: EmbedColor | null;
  footer?: string | null;
}

export type EmbedThemé = (ctx?: ContexteEmbed) => EmbedBuilder;

export function creerEmbedFactory(theme: Theme): EmbedThemé {
  return (ctx = {}) => {
    const embed = new EmbedBuilder().setColor(ctx.couleurGuilde ?? theme.couleurDefaut);
    const footer = ctx.footer ?? theme.footerDefaut;
    if (footer) embed.setFooter({ text: footer });
    return embed;
  };
}
