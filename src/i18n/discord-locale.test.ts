/**
 * Adapter discord-locale : traduit le tag de locale Discord (`guild.preferredLocale`,
 * ex. "en-US") en `LocaleTag` du gabarit, par PREFIXE. Vit hors domaine (peut toucher
 * l'enum Discord) : le VO Locale reste pur (purity #16).
 */
import { describe, expect, it } from "bun:test";
import { mapperDiscordLocale } from "./discord-locale";

describe("mapperDiscordLocale", () => {
  it("mappe les variantes anglaises sur en", () => {
    expect(mapperDiscordLocale("en-US")).toBe("en");
    expect(mapperDiscordLocale("en-GB")).toBe("en");
  });

  it("mappe le francais sur fr", () => {
    expect(mapperDiscordLocale("fr")).toBe("fr");
  });

  it("renvoie null pour une locale non supportee", () => {
    expect(mapperDiscordLocale("es-ES")).toBeNull();
    expect(mapperDiscordLocale("de")).toBeNull();
    expect(mapperDiscordLocale(null)).toBeNull();
  });
});
