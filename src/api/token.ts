/**
 * Comparaison de token en temps constant.
 *
 * On hache les deux valeurs en SHA-256 (longueur fixe 32 o) AVANT `timingSafeEqual`
 * pour ne pas fuiter la longueur du secret et satisfaire l'exigence de longueur
 * égale du comparateur. Empêche le timing attack sur le token /stats.
 */
import { createHash, timingSafeEqual } from "node:crypto";

export function safeTokenEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}
