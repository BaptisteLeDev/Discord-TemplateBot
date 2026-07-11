/**
 * VO EmbedColor (#socle) : type marque, obtenu SEULEMENT via parseEmbedColor.
 * Une couleur est forcement dans 0..0xFFFFFF ; sinon null. Accepte #rrggbb, 0x..,
 * hex nu, ou un entier deja borne.
 */
import { describe, expect, it } from "bun:test";
import { parseEmbedColor, type EmbedColor } from "./embed-color";

/** Valeur attendue en type marque (le VO n'est teste que par parseEmbedColor). */
const couleur = (n: number): EmbedColor => n as EmbedColor;

describe("VO EmbedColor", () => {
  it("parse un hex prefixe #", () => {
    expect(parseEmbedColor("#ff8800")).toBe(couleur(0xff8800));
  });

  it("parse un hex prefixe 0x et un hex nu", () => {
    expect(parseEmbedColor("0x00FF00")).toBe(couleur(0x00ff00));
    expect(parseEmbedColor("ABCDEF")).toBe(couleur(0xabcdef));
  });

  it("accepte un entier deja dans la plage", () => {
    expect(parseEmbedColor(0)).toBe(couleur(0));
    expect(parseEmbedColor(0xffffff)).toBe(couleur(0xffffff));
  });

  it("renvoie null hors plage ou non parsable", () => {
    expect(parseEmbedColor(-1)).toBeNull();
    expect(parseEmbedColor(0x1000000)).toBeNull();
    expect(parseEmbedColor("nope")).toBeNull();
    expect(parseEmbedColor("")).toBeNull();
    expect(parseEmbedColor(1.5)).toBeNull();
  });

  it("rejette un hex partiellement valide (pas de parse du prefixe seul)", () => {
    expect(parseEmbedColor("12g456")).toBeNull();
    expect(parseEmbedColor("5865F2zzz")).toBeNull();
    expect(parseEmbedColor("#3498dbXX")).toBeNull();
  });

  it("accepte toujours les formes valides apres durcissement", () => {
    expect(parseEmbedColor("#3498db")).toBe(couleur(0x3498db));
    expect(parseEmbedColor("3498db")).toBe(couleur(0x3498db));
    expect(parseEmbedColor("0x3498db")).toBe(couleur(0x3498db));
  });
});
