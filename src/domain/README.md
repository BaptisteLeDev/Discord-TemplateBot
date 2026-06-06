# Domaine (bounded context) — gabarit

> Cœur métier du bot. **Pur** : aucune dépendance à `discord.js`, à Fastify ou à
> l'I/O. C'est l'invariant que protège l'architecture hexagonale.

Ce dossier est **volontairement vide** dans le gabarit : un squelette n'a pas de
domaine. Il existe pour rappeler la frontière et accueillir votre logique métier
dès qu'elle apparaît.

## La règle : ZÉRO import de `discord.js`

Le domaine ne connaît ni Discord, ni Fastify, ni le réseau. Concrètement, **aucun
fichier de `src/domain/` ne doit importer `discord.js`** (ni `fastify`, ni un client
HTTP, ni `fs`/`process` pour de l'I/O). Si vous en avez besoin, c'est que la logique
a fui hors du domaine : remontez-la dans un adapter.

- Les **adapters** (`src/commands/`, `src/events/`) traduisent une interaction Discord
  vers le domaine, appellent une fonction pure, puis reposent le résultat.
- L'**API HTTP** (`src/api/`) ne dépend pas non plus du domaine Discord : elle reçoit
  le port `StatsProvider` (cf. `src/api/stats-provider.ts`).

## Pourquoi

- **Testabilité** : une règle métier pure se teste en mémoire, sans bot connecté ni
  serveur. Si tester une règle exige une connexion Discord, la frontière est cassée.
- **Remplaçabilité** : on peut changer la version de discord.js, voire de framework,
  sans toucher au cœur métier.

## Comment s'en servir

1. Écrivez la logique métier ici en fonctions/valeurs **pures** (entrées → sorties),
   avec leurs tests colocalisés (`*.test.ts`, runner `bun:test`).
2. Dans `src/commands/` ou `src/events/`, importez ces fonctions et branchez-les sur
   l'interaction Discord.
3. Renseignez le **langage ubiquitaire** (termes du métier), les **invariants** et la
   **provenance des données** de ce contexte au fur et à mesure (mandat ARCHITECTURE.md).
