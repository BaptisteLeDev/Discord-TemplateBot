/**
 * VO Locale (#socle) : smart constructor. Seuls "fr"|"en" existent ; toute autre
 * entree -> null. Etats invalides irrepresentables.
 */
import { describe, expect, it } from "bun:test";
import { LOCALES, LOCALE_DEFAUT, parseLocale } from "./locale";

describe("VO Locale", () => {
  it("expose les locales supportees et le defaut FR", () => {
    expect([...LOCALES]).toEqual(["fr", "en"]);
    expect(LOCALE_DEFAUT).toBe("fr");
  });

  it("parse les tags valides, insensible casse et espaces", () => {
    expect(parseLocale("fr")).toBe("fr");
    expect(parseLocale("EN")).toBe("en");
    expect(parseLocale("  Fr  ")).toBe("fr");
  });

  it("renvoie null sur une entree invalide", () => {
    expect(parseLocale("es")).toBeNull();
    expect(parseLocale("")).toBeNull();
    expect(parseLocale("en-US")).toBeNull();
  });
});
