/**
 * VO EmbedColor (PUR, socle de flotte). Couleur d'embed Discord (entier RGB 24 bits).
 *
 * Type MARQUE : un `EmbedColor` ne s'obtient QUE via `parseEmbedColor`. La fabrique
 * d'embeds (`src/theming/embed.ts`) n'accepte que ce type -> une couleur invalide
 * ne peut structurellement pas atteindre `.setColor` (etat invalide irrepresentable).
 */
export type EmbedColor = number & { readonly __brand: "EmbedColor" };

/**
 * Parse une couleur depuis `#rrggbb`, `0xRRGGBB`, un hex nu, ou un entier deja borne.
 * Renvoie `null` si non parsable ou hors de la plage `0..0xFFFFFF`.
 */
export function parseEmbedColor(input: string | number): EmbedColor | null {
  let n: number;
  if (typeof input === "number") {
    n = input;
  } else {
    const clean = input.trim().replace(/^#/, "").replace(/^0x/i, "");
    // Valider AVANT parseInt : parseInt("12g456", 16) parse le prefixe et ignore
    // le reste (0x12 = valide a tort). On exige un hex integralement bien forme.
    if (!/^[0-9a-f]{1,6}$/i.test(clean)) return null;
    n = Number.parseInt(clean, 16);
  }
  if (!Number.isInteger(n) || n < 0 || n > 0xffffff) return null;
  return n as EmbedColor;
}
