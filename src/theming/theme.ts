/**
 * Theme du bot (CONFIG, hors domaine). Constantes de charte injectees a la composition :
 * couleur et footer par defaut. C'est LE point unique a modifier pour rebrander le bot.
 *
 * Vit hors `src/domain/` (importe un type Discord-adjacent via l'adapter embed) mais ne
 * depend pas de discord.js lui-meme : ce sont de simples valeurs. La couleur passe par
 * `parseEmbedColor` -> une couleur de theme invalide est impossible a construire.
 */
import { parseEmbedColor, type EmbedColor } from "../domain/embed-color";

export interface Theme {
  /** Couleur d'embed par defaut du bot (surchargée par guilde via /config). */
  readonly couleurDefaut: EmbedColor;
  /** Footer par defaut, ou `null` pour ne pas afficher de footer. */
  readonly footerDefaut: string | null;
}

/** Blurple Discord ; footer neutre (aucun). A personnaliser par bot derive. */
export const THEME_DEFAUT: Theme = {
  couleurDefaut: parseEmbedColor(0x5865f2)!,
  footerDefaut: null,
};
