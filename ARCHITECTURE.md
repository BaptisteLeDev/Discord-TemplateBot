# Architecture

Ce document décrit la structure du gabarit, ses frontières et les invariants à respecter
quand on le dérive en un vrai bot.

## Stack

- **Langage** : TypeScript 5.7 (strict).
- **Runtime** : Bun 1.3+ (exécute le TS directement, pas d'étape de build).
- **Bot** : Discord.js v14.
- **API** : Fastify v5.
- **Validation** : Zod v3.
- **Tests** : `bun:test` (tests colocalisés `*.test.ts`).

## Principe directeur : hexagonal (ports & adapters)

Le **domaine** (cœur métier) ne dépend de rien d'externe. Les dépendances pointent vers
l'intérieur : infra → application → domaine, jamais l'inverse.

```
                 ┌─────────────────────────────┐
   Discord ─────►│  commands/  events/         │  adapters entrants
                 │  (traduisent vers le domaine)│
                 └──────────────┬──────────────┘
                                ▼
                        ┌───────────────┐
                        │   domain/     │   logique PURE (zéro import discord.js)
                        └───────────────┘
                                ▲
                 ┌──────────────┴──────────────┐
   HTTP ────────►│  api/  (Fastify)            │  adapter entrant, dépend du PORT
                 │  ── StatsProvider (port) ───│  StatsProvider, pas de Discord.js
                 └─────────────────────────────┘
                                ▲
                        ┌───────┴───────┐
                        │  client.ts    │   adapter Discord : implements StatsProvider
                        └───────────────┘
```

### Le domaine est pur

`src/domain/` ne doit **jamais** importer `discord.js`, `fastify` ni faire d'I/O. Une règle
métier qui exige une connexion Discord pour être testée a fui hors du domaine. Détail et
justification : `src/domain/README.md`. Le gabarit livre ce dossier vide (un squelette n'a
pas de domaine).

### Les commandes et events sont des adapters

`src/commands/` et `src/events/` reçoivent une interaction / un évènement Discord, appellent
une fonction pure du domaine, puis reposent le résultat. Ils ne portent pas de logique métier.
Le `Command` (cf. `src/commands/types.ts`) est un descripteur (`data`) + un handler (`execute`).

## Le port StatsProvider (ACL Discord ↔ API HTTP)

L'API HTTP ne connaît pas Discord.js. Elle dépend d'un **port** :

```ts
// src/api/stats-provider.ts
interface StatsProvider {
  getStats(): BotStats;   // guildCount, userCount, commandsToday, discordLatencyMs, version
}
```

- `createApiServer({ statsProvider })` reçoit le port par **injection** (`src/api/server.ts`).
- `BotClient implements StatsProvider` : l'adapter Discord fournit `getStats()` (`src/client.ts`).

Conséquence directe : on teste le contrat `/stats` avec un provider factice, **sans connexion
Discord réelle** (cf. `src/api/contract.test.ts`). C'est l'anti-corruption layer : le modèle
Discord ne fuit pas dans la couche HTTP.

## Contrat monitoring (published language)

Les routes `/health` et `/stats` à la racine sont le **langage publié** du bounded context
Fleet Monitoring. Le contrat impose les noms de champs `guildCount` / `userCount` (pas
`guilds` / `users`).

Invariants :
- `/health` répond 2xx **rapidement et sans I/O Discord** (preuve de vie indépendante de
  l'état de connexion du bot).
- Au boot, l'**API démarre avant le bot** (`src/index.ts`) : `/health` reste servi même si
  le login Discord échoue (try/catch non bloquant).
- `version` vient de `package.json` (source unique), pas d'un littéral en dur.

La suite `src/api/contract.test.ts` vérifie ces invariants et sert de **gate d'onboarding**
au registre monitoring.

## Configuration

`src/config.ts` expose `loadConfig(env = process.env)` : validation Zod, échec de boot
**explicite et agrégé** si une variable requise manque. Bun charge `.env` automatiquement,
donc pas de `dotenv`. Injecter `env` rend la config testable sans toucher `process.env`.
Toute la provenance de la config passe par ce module (un seul endroit à changer).

## Flux de démarrage

```
loadConfig()                  validation Zod (échoue fort si invalide)
   │
   ├─► new BotClient()        registre des commandes, listeners
   │
   ├─► createApiServer({ statsProvider: bot })   API d'abord
   │      └─► api.listen()    /health, /stats disponibles
   │
   └─► bot.start(token)       bot ensuite (échec login non bloquant pour l'API)
          └─► graceful shutdown (SIGINT / SIGTERM)
```

## Anti-cérémonie

Les dossiers décoratifs vides ne sont pas conservés : `services/`, `utils/`, `types/` du
gabarit v1 ont été retirés faute d'usage réel. On ajoute un dossier/une abstraction quand
une duplication réelle (règle de 3) ou une frontière le justifie, pas par anticipation.
`domain/` et `events/` restent présents (vides, documentés) parce qu'ils matérialisent une
frontière de l'architecture, pas du remplissage.

## Déploiement

- **Dockerfile** Bun de référence : `oven/bun` slim, non-root, `HEALTHCHECK /health`, pas de
  build, démarrage `dotenvx run` (déchiffre `.env.production`, clé hors repo).
- **CI** (`.github/workflows/ci.yml`) : gate (typecheck + `bun test` + build image + smoke
  `/health`). Le job `deploy` (CD gated vers Dokploy via tailnet) est fourni en
  commentaire-modèle ; le gabarit n'a pas d'app Dokploy à cibler.
