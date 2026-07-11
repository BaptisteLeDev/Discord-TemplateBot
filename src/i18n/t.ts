/**
 * Accesseur i18n (PUR). `t(locale)` renvoie le jeu de messages type de la locale.
 * L'appelant lit ensuite les proprietes natives (`t(l).config.commandeDescription`),
 * ce qui rend toute cle manquante detectable a la COMPILATION.
 */
import type { LocaleTag } from "../domain/locale";
import { CATALOGUE, type Messages } from "./catalog";

export const t = (locale: LocaleTag): Messages => CATALOGUE[locale];
