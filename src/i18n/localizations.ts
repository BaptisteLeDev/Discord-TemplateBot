/**
 * Adapter localizations (hors domaine). Projette une chaine du catalogue sur la
 * `LocalizationMap` de discord.js : `.setDescriptionLocalizations(localisations(sel))`.
 *
 * Un `LocaleTag` du gabarit peut couvrir PLUSIEURS codes Discord (en -> en-US + en-GB).
 * On NE localise QUE les descriptions / noms de choices, jamais le NOM des commandes
 * (le nom reste stable : le changer modifierait ce que l'utilisateur tape).
 */
import { Locale, type LocalizationMap } from "discord.js";
import type { LocaleTag } from "../domain/locale";
import { CATALOGUE, type Messages } from "./catalog";

/** Codes de locale Discord couverts par chaque `LocaleTag` du gabarit. */
const TAG_VERS_CODES: Record<LocaleTag, readonly Locale[]> = {
  fr: [Locale.French],
  en: [Locale.EnglishUS, Locale.EnglishGB],
};

export function localisations(selecteur: (m: Messages) => string): LocalizationMap {
  const map: LocalizationMap = {};
  for (const tag of Object.keys(TAG_VERS_CODES) as LocaleTag[]) {
    const valeur = selecteur(CATALOGUE[tag]);
    for (const code of TAG_VERS_CODES[tag]) {
      map[code] = valeur;
    }
  }
  return map;
}
