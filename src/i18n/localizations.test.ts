/**
 * Adapter localizations : projette un message du catalogue sur la `LocalizationMap`
 * discord.js (une entree par code de locale Discord). FR -> "fr" ; EN -> "en-US" et
 * "en-GB". Sert a localiser descriptions de commandes/options cote Discord.
 */
import { describe, expect, it } from "bun:test";
import { Locale } from "discord.js";
import { localisations } from "./localizations";
import { en, fr } from "./catalog";

describe("localisations", () => {
  it("mappe chaque code de locale Discord sur la chaine du catalogue", () => {
    const map = localisations((m) => m.config.commandeDescription);
    expect(map[Locale.French]).toBe(fr.config.commandeDescription);
    expect(map[Locale.EnglishUS]).toBe(en.config.commandeDescription);
    expect(map[Locale.EnglishGB]).toBe(en.config.commandeDescription);
  });

  it("applique le selecteur en profondeur", () => {
    const map = localisations((m) => m.config.couleur.optionDescription);
    expect(map[Locale.French]).toBe(fr.config.couleur.optionDescription);
    expect(map[Locale.EnglishUS]).toBe(en.config.couleur.optionDescription);
  });
});
