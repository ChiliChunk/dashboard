# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Vue d'ensemble

Dashboard de suivi d'activités sportives (course, vélo, rando). Deux
processus locaux, sans rien d'hébergé à distance :

- **Frontend** : Vite + React 18 + TypeScript strict, à la racine du dépôt.
- **Backend** : `garmin-service/`, un serveur Python minimal (aucun
  framework) qui parle à Garmin Connect via `garminconnect` et n'écoute que
  sur `127.0.0.1:8799`.

Le frontend ne fait jamais de flux OAuth ni d'authentification : il
interroge uniquement le service Garmin local, qui lit ses identifiants dans
`garmin-service/.env` (`GARMIN_EMAIL`, `GARMIN_PASSWORD`, voir
`.env.example`). Historique : le projet utilisait Strava avant que son API
ne devienne payante ; ce nom de base IndexedDB (`garmin-dashboard`, voir
`src/data/store.ts`) a été changé exprès à ce moment pour abandonner tout
cache Strava résiduel.

## Commandes

Toutes les commandes ci-dessous s'exécutent depuis la racine du dépôt (le
service Python a son propre dossier, voir plus bas).

```bash
npm run dev       # serveur Vite, http://localhost:5173
npm run build     # tsc -b puis build Vite
npm run lint      # eslint .
npm run test      # vitest run (tous les tests)
npm run preview   # sert le build de production localement
```

Lancer un seul fichier de test :

```bash
npx vitest run src/domain/incremental.test.ts
```

Pour lancer l'app complète (backend + frontend) en local, utiliser le skill
`lancer-app` plutôt que de deviner l'ordre des commandes — le frontend
interroge le backend dès son premier rendu, donc l'ordre de démarrage compte.
Résumé :

```bash
cd garmin-service && "C:\Python39\python.exe" main.py   # backend, en arrière-plan
npm run dev                                               # frontend
```

Ne pas utiliser `wrangler pages dev` : c'est un résidu d'une itération
précédente qui reposait sur des fonctions serverless (OAuth Strava),
entièrement supprimées depuis.

## Architecture

Flux de données, dans l'ordre :

```
garmin-service (Python, 127.0.0.1:8799)
  → src/data/garmin.ts     (fetch + parsing brut)
  → src/domain/schemas.ts  (validation valibot de la forme Garmin)
  → src/domain/activity.ts (normalisation vers le type Activity interne)
  → src/data/store.ts      (persistance IndexedDB, via `idb`)
  → src/data/sync.ts       (hook useSync : orchestre la synchronisation incrémentale)
  → src/App.tsx / src/routes.tsx / src/ui/*  (affichage)
```

Points structurants à connaître avant de toucher à la synchronisation ou au
stockage :

- **`src/data/store.ts`** garde une connexion IndexedDB unique
  (`dbPromise` au niveau module) plutôt que d'en ouvrir une par appel :
  `indexedDB.deleteDatabase` reste bloqué tant qu'une connexion ouverte
  subsiste ailleurs. Le nom de base (`ACTIVITY_DATABASE_NAME`) et la version
  de schéma vivent ici.
- **`src/data/sync.ts`** (hook `useSync`, appelé une seule fois dans
  `App.tsx`) est strictement incrémental : IndexedDB fait foi, le curseur de
  synchronisation (`SyncCursor.lastActivityStart`, un epoch GMT) détermine ce
  qui est redemandé au service Garmin. Les pages arrivent triées de la plus
  récente à la plus ancienne ; dès qu'une activité déjà connue apparaît dans
  une page, la pagination s'arrête (`src/domain/incremental.ts`). Le curseur
  n'avance qu'après une passe complète, pour qu'un échec en cours de route
  laisse la prochaine visite reprendre le travail sans rien perdre. Un seul
  compte étant pris en charge, `SyncCursor.athleteId` vaut toujours 0.
- **`src/domain/`** contient toute la logique métier pure (agrégation,
  filtrage, périodes, unités, projection de tracé), testée indépendamment de
  React et du stockage — c'est le dossier à privilégier pour la logique
  nouvelle, plutôt que de l'enfouir dans un composant `ui/`.
- **`src/domain/schemas.ts`** documente les incohérences Garmin découvertes
  en vérifiant contre un vrai compte : trois notions de durée
  (`duration`/`movingDuration`/`elapsedDuration`) dont `movingDuration` peut
  dépasser `duration` en randonnée, et l'absence d'un appel Garmin équivalent
  à « détail d'une activité » (le détail d'une sortie vient donc du cache
  local déjà synchronisé, jamais re-demandé au réseau — voir
  `getActivityById` dans `src/data/store.ts`). Cadence, puissance et tracé
  GPS ont des noms de champs confirmés mais ne sont pas encore câblés
  (laissé pour une itération suivante si besoin).
- **`garmin-service/main.py`** expose une seule route,
  `GET /activities?offset=&limit=` (limit plafonné à 200), triée de la plus
  récente à la plus ancienne. Il ne filtre ni ne déduplique rien : c'est le
  front qui décide ce qui est nouveau. Les en-têtes CORS sont ouverts (`*`)
  volontairement — le service n'écoutant que sur l'interface de boucle
  locale, cela ne l'expose pas au réseau, et c'est nécessaire pour que le
  front (autre origine/port) puisse lire la réponse.

## Conventions de code

- Les commentaires expliquent des décisions non évidentes (pourquoi une
  connexion IndexedDB unique, pourquoi le curseur est en GMT, pourquoi tel
  champ Garmin est écarté) — pas ce que fait le code. Continuer sur ce
  modèle plutôt que d'ajouter des commentaires descriptifs.
- TypeScript strict avec `noUncheckedIndexedAccess`,
  `noUnusedLocals`/`noUnusedParameters` : pas de suppressions ad hoc, corriger
  à la source.
- Tests colocalisés en `*.test.ts` à côté du fichier testé (pas de dossier
  `__tests__` séparé), environnement `node` (pas de DOM réel — voir
  `vitest.config.ts`). `fake-indexeddb` est utilisé pour tester
  `src/data/store.ts` sans navigateur.
