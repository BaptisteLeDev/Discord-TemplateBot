/**
 * Accesseur `t(locale)` : renvoie le jeu de messages type de la locale. Acces type,
 * zero miss runtime.
 */
import { describe, expect, it } from "bun:test";
import { t } from "./t";
import { en, fr } from "./catalog";

describe("t(locale)", () => {
  it("renvoie le catalogue FR", () => {
    expect(t("fr")).toBe(fr);
  });

  it("renvoie le catalogue EN", () => {
    expect(t("en")).toBe(en);
  });
});
