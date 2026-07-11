/**
 * Fabrique d'embeds themes (#socle). Centralise la charte : couleur/footer par defaut
 * du bot, override de couleur par guilde. Le type `EmbedColor` (obtenu seulement via
 * parseEmbedColor) empeche une couleur invalide d'atteindre `.setColor`.
 */
import { describe, expect, it } from "bun:test";
import { parseEmbedColor } from "../domain/embed-color";
import { creerEmbedFactory } from "./embed";
import { THEME_DEFAUT } from "./theme";

describe("creerEmbedFactory", () => {
  it("applique la couleur par defaut du theme sans contexte", () => {
    const embed = creerEmbedFactory(THEME_DEFAUT)();
    expect(embed.data.color).toBe(THEME_DEFAUT.couleurDefaut);
  });

  it("prefere la couleur de la guilde quand elle est fournie", () => {
    const rouge = parseEmbedColor(0xff0000)!;
    const embed = creerEmbedFactory(THEME_DEFAUT)({ couleurGuilde: rouge });
    expect(embed.data.color).toBe(rouge);
  });

  it("retombe sur la couleur du theme si le contexte guilde est null", () => {
    const embed = creerEmbedFactory(THEME_DEFAUT)({ couleurGuilde: null });
    expect(embed.data.color).toBe(THEME_DEFAUT.couleurDefaut);
  });

  it("pose le footer fourni en contexte", () => {
    const embed = creerEmbedFactory(THEME_DEFAUT)({ footer: "Mon serveur" });
    expect(embed.data.footer?.text).toBe("Mon serveur");
  });

  it("n'ajoute pas de footer quand ni contexte ni theme n'en definissent", () => {
    const factory = creerEmbedFactory({
      couleurDefaut: THEME_DEFAUT.couleurDefaut,
      footerDefaut: null,
    });
    expect(factory().data.footer).toBeUndefined();
  });
});
