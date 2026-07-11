/**
 * Resolution de locale (PUR). Ordre de priorite :
 *   override /config  >  locale de la guilde Discord  >  FR (defaut).
 */
import { describe, expect, it } from "bun:test";
import { resoudreLocale } from "./locale-resolution";

describe("resoudreLocale", () => {
  it("prend l'override /config en priorite absolue", () => {
    expect(resoudreLocale({ overrideGuild: "en", localeGuildeDiscord: "fr" })).toBe("en");
  });

  it("retombe sur la locale Discord si pas d'override", () => {
    expect(resoudreLocale({ overrideGuild: null, localeGuildeDiscord: "en" })).toBe("en");
  });

  it("retombe sur FR si ni override ni locale Discord", () => {
    expect(resoudreLocale({ overrideGuild: null, localeGuildeDiscord: null })).toBe("fr");
  });
});
