/**
 * Catalogue i18n type fort (#socle). FR est rempli ; EN porte TOUTES les cles
 * (`en: Messages` le force a la compilation). Ce test verrouille en plus la parite
 * structurelle FR/EN au runtime (aucune cle divergente) et le rendu parametrique.
 */
import { describe, expect, it } from "bun:test";
import { CATALOGUE, en, fr, type Messages } from "./catalog";

/** Chemins de toutes les feuilles d'un catalogue (les fonctions comptent comme feuilles). */
function chemins(obj: unknown, prefixe = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefixe];
  return Object.entries(obj).flatMap(([cle, val]) =>
    chemins(val, prefixe ? `${prefixe}.${cle}` : cle),
  );
}

describe("catalogue i18n", () => {
  it("FR est rempli (chaines non vides)", () => {
    expect(fr.config.commandeDescription.length).toBeGreaterThan(0);
    expect(fr.erreurGenerique.length).toBeGreaterThan(0);
    expect(fr.ping.description.length).toBeGreaterThan(0);
  });

  it("EN porte exactement les memes cles que FR (parite structurelle)", () => {
    expect(chemins(en).toSorted()).toEqual(chemins(fr).toSorted());
  });

  it("rend les messages parametriques", () => {
    expect(fr.config.langue.definie({ locale: "fr" })).toContain("fr");
    expect(fr.ping.reponse({ latence: 42 })).toContain("42");
  });

  it("CATALOGUE mappe chaque locale sur son jeu de messages", () => {
    const messages: Messages = CATALOGUE.fr;
    expect(messages).toBe(fr);
    expect(CATALOGUE.en).toBe(en);
  });
});
