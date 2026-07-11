/**
 * Test de fitness "domaine pur" : socle de flotte (issue #16).
 *
 * L'invariant hexagonal du gabarit (src/domain/README.md) devient exécutable :
 * aucun fichier de src/domain/ ne doit importer discord.js, Fastify, fs ou
 * process. Hérité par tout bot dérivé du gabarit, le test échoue en nommant
 * le fichier fautif et l'import en cause.
 *
 * Les tests colocalisés (*.test.ts) sont exclus du scan : ce fichier lui-même
 * lit le disque pour scanner le domaine.
 *
 * LIMITE (assumée) : le scan est LEXICAL et DIRECT. Il garantit qu'aucun fichier
 * du domaine n'importe DIRECTEMENT un module interdit, PAS la clôture transitive.
 * Un fichier pur qui importerait un helper (du domaine) lui-même importateur de
 * discord.js resterait invisible ici. On accepte ce compromis : le domaine n'a pas
 * de dépendances internes vers l'infra par construction, et un scan transitif
 * (résolution de graphe) ajouterait une complexité disproportionnée pour le socle.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DOMAINE = import.meta.dir;

// Un import est interdit s'il désigne exactement l'un de ces modules ou un
// sous-chemin (ex. "fs/promises", "discord.js/typings", "@fastify/cors").
const MODULES_INTERDITS = [
  "discord.js",
  "@discordjs",
  "fastify",
  "@fastify",
  "fs",
  "node:fs",
  "process",
  "node:process",
];

function fichiersDuDomaine(dossier: string): string[] {
  return readdirSync(dossier, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => join(dossier, f));
}

function importsDe(source: string): string[] {
  const motif = /\b(?:from|import|require)\s*\(?\s*["']([^"']+)["']/g;
  return [...source.matchAll(motif)].map(([, spec]) => spec as string);
}

function estInterdit(spec: string): boolean {
  return MODULES_INTERDITS.some((m) => spec === m || spec.startsWith(`${m}/`));
}

describe("domaine pur (#16)", () => {
  it("aucun fichier de src/domain n'importe discord.js, fastify, fs ou process", () => {
    const fautifs: string[] = [];
    for (const fichier of fichiersDuDomaine(DOMAINE)) {
      for (const spec of importsDe(readFileSync(fichier, "utf8"))) {
        if (estInterdit(spec)) fautifs.push(`${fichier} → import "${spec}"`);
      }
    }
    expect(fautifs).toEqual([]);
  });
});
