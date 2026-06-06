# Contribuer

Guide pour travailler sur ce gabarit (ou un bot qui en dérive).

## Prérequis

- [Bun](https://bun.sh) 1.3+
- Un bot Discord (token + application ID) depuis le Developer Portal.

## Mise en route

```bash
bun install
cp .env.example .env        # renseigner les identifiants Discord
bun src/deploy-commands.ts  # enregistrer les slash commands
bun --watch src/index.ts    # lancer en dev (rechargement à chaud)
```

## Boucle de dev

```bash
bun run typecheck   # tsc --noEmit
bun test            # suite complète
bun test --watch    # en continu pendant le dev
```

Avant de pousser : `bun run typecheck` ET `bun test` doivent passer. Le gate CI rejoue
les deux, plus le build de l'image Docker et un smoke test `/health`.

## Standards de code

- TypeScript partout, `strict` activé (cf. `tsconfig.json`). Pas de `any` : préférer un type
  précis ou `unknown`.
- Le **domaine** (`src/domain/`) est PUR : aucun import `discord.js`, `fastify`, ni I/O
  (cf. `src/domain/README.md`). La logique métier vit là, les commandes/events la branchent.
- Pas de commentaires inutiles : le code bien nommé se suffit. Documenter les invariants et
  les frontières, pas la mécanique évidente.
- Exports nommés. Le français est accepté dans le code de domaine si c'est le langage du métier.

## Tests

Runner : **`bun:test`** (`import { describe, expect, it } from 'bun:test'`). Tests
**colocalisés** à côté du code (`mon-module.test.ts`), pas de dossier `__tests__`.

Critère : **chaque story / comportement notable est couvert par un test**. On ne vise pas un
pourcentage de couverture imposé (pas de dogme « 80 % ») : on teste ce qui porte un risque ou
un invariant (règles du domaine, contrat de l'API, tracer bullets de bout en bout). La suite
de contrat `src/api/contract.test.ts` est le modèle pour le gate monitoring.

Exemple (commande, `src/commands/ping.test.ts`) :

```ts
import { describe, expect, it } from 'bun:test';
import { pingCommand } from './ping';

describe('commande /ping', () => {
  it('répond un message contenant "Pong"', async () => {
    let replied = '';
    const fake = { isChatInputCommand: () => true, client: { ws: { ping: 42 } },
      reply: (c: string) => { replied = c; return Promise.resolve(); } };
    await pingCommand.execute(fake as never);
    expect(replied).toContain('Pong');
  });
});
```

## Ajouter du code

- **Commande** : copier `src/commands/ping.ts` + son test, l'ajouter à `creerCommandes`
  (`src/commands/index.ts`), puis `bun src/deploy-commands.ts`.
- **Évènement Discord** : un fichier dans `src/events/`, abonnement dans `src/client.ts`.
- **Règle métier** : une fonction pure dans `src/domain/` avec son test colocalisé.

Avant d'ajouter une abstraction ou un dossier : vérifier qu'une duplication réelle (règle de
3) ou une frontière le justifie. Sinon, ne pas l'ajouter (anti-cérémonie, cf. `ARCHITECTURE.md`).

## Commits

[Conventional Commits](https://www.conventionalcommits.org/) : `feat:`, `fix:`, `docs:`,
`refactor:`, `test:`, `chore:`, `ci:`.
