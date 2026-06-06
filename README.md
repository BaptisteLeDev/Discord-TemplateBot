# Discord TemplateBot

Gabarit de bot Discord de la flotte BotDiscordFactory : runtime **Bun**, TypeScript,
architecture **hexagonale**, contrat **monitoring** (`/health` + `/stats`). C'est un
**squelette minimal** (une commande `/ping` + l'API de contrat), pas un bot complet :
on le clone pour démarrer un nouveau bot, on greffe le domaine métier dans `src/domain/`.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Bun](https://img.shields.io/badge/Bun-1.3-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Discord.js](https://img.shields.io/badge/Discord.js-14.x-5865F2)
![Fastify](https://img.shields.io/badge/Fastify-5.x-000000)

## Caractéristiques

- **Runtime Bun** : pas d'étape de build, Bun exécute le TypeScript directement.
- **Architecture hexagonale** : domaine pur isolé de Discord.js (cf. `src/domain/README.md`).
- **Contrat monitoring** : `/health` et `/stats` à la racine, avec un port `StatsProvider`
  qui découple l'API HTTP du client Discord (ACL).
- **Tests `bun:test`** colocalisés, dont la **suite de contrat** (gate d'onboarding monitoring).
- **Docker** : Dockerfile Bun de référence (non-root, `HEALTHCHECK /health`, `dotenvx`) + CI.

## Structure

```
src/
├── domain/        # Coeur métier PUR (zéro import discord.js). Vide dans le gabarit.
├── commands/      # Slash commands (adapters Discord) + tests colocalisés. Exemple : ping.
├── events/        # Handlers d'évènements Discord (adapters). Vide dans le gabarit.
├── api/           # Serveur Fastify + port StatsProvider + suite de contrat.
├── config.ts      # loadConfig(env) : validation zod, chargement .env natif Bun.
├── client.ts      # BotClient (adapter Discord, implémente StatsProvider).
├── index.ts       # Bootstrap : API d'abord, bot ensuite.
└── deploy-commands.ts  # Enregistrement des slash commands.
```

## Démarrage

### Prérequis

- [Bun](https://bun.sh) 1.3+
- Un bot Discord (token + application ID) depuis le Developer Portal.

### Installation

```bash
bun install
```

### Configuration

Copier `.env.example` en `.env` et renseigner les valeurs (Bun charge `.env` automatiquement) :

```bash
cp .env.example .env
```

Variables :
- `DISCORD_TOKEN` : token du bot.
- `DISCORD_APPLICATION_ID` : ID de l'application.
- `DISCORD_GUILD_ID` (optionnel) : si renseigné, les commandes se déploient sur cette
  guild (instantané, idéal en dev). Sinon, déploiement global (jusqu'à 1h de propagation).
- `PORT` : port de l'API (défaut 3001).
- `HOST` : adresse d'écoute (défaut 0.0.0.0).
- `NODE_ENV` : `development` | `production` | `test`.

### Déployer les commandes

```bash
bun src/deploy-commands.ts
# ou : bun run deploy-commands
```

### Lancer le bot

```bash
# Développement (rechargement à chaud) :
bun --watch src/index.ts    # ou : bun run dev

# Production :
bun src/index.ts            # ou : bun run start
```

### Tests et typecheck

```bash
bun test                    # suite complète (contrat + commandes)
bun test --watch
bun run typecheck           # tsc --noEmit
```

## API (contrat monitoring)

L'API HTTP sert le contrat publié cibles ↔ bdf-monitor, à la **racine** :

| Route     | Description                                                         |
|-----------|---------------------------------------------------------------------|
| `GET /`        | Info API : liste des endpoints.                                |
| `GET /health`  | Preuve de vie. Répond 2xx vite, **sans I/O Discord**.          |
| `GET /stats`   | Métriques : `guildCount`, `userCount`, `commandsToday`, `discordLatencyMs`, `version`. |

La **suite de contrat** (`src/api/contract.test.ts`) est le **gate d'onboarding** au
registre monitoring : tant qu'elle n'est pas verte, le bot n'est pas inscrit. Côté flotte,
un bot s'enregistre une fois que ce contrat est honoré.

## Docker

```bash
docker build -t mon-bot .
```

Image `oven/bun` slim, utilisateur non-root, `HEALTHCHECK` sur `/health`, démarrage via
`dotenvx run` (déchiffrement de `.env.production`). Pas d'étape de build : Bun exécute
le TS. Voir `Dockerfile` et `.github/workflows/ci.yml` (le job `deploy` est un modèle
commenté : le gabarit n'a pas d'app Dokploy).

## Ajouter une commande

1. Copier `src/commands/ping.ts` (et `ping.test.ts`) sous un nouveau nom.
2. L'ajouter au registre dans `src/commands/index.ts` (`creerCommandes`).
3. `bun src/deploy-commands.ts` pour l'enregistrer auprès de Discord.

La logique métier va dans `src/domain/` (fonctions pures), la commande la branche.
Voir `ARCHITECTURE.md` et `src/domain/README.md`.
