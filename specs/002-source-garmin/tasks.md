# Tâches — Source de données Garmin pour le tableau de bord

**Spec source** : `specs/002-source-garmin/spec.md`
**Plan source** : `specs/002-source-garmin/plan.md`
**Date** : 2026-07-29

> Chaque tâche est atomique, ordonnée, et rattachée à un critère d'acceptation.
> Une tâche qui ne se rattache à rien ne doit pas exister.

Légende : `[P]` = parallélisable avec les tâches voisines portant la même marque.

---

## Lot 0 — Socle

- [x] **T001** — Squelette du service local Garmin
  - Fichiers : `garmin-service/requirements.txt`, `garmin-service/.env.example`, `garmin-service/main.py`
  - Dépend de : —
  - Couvre : — (fondation, prérequis à CA1.1–CA1.4)
  - Terminé quand : `garmin-service/main.py` démarre un serveur HTTP local, lit `GARMIN_EMAIL`/`GARMIN_PASSWORD` depuis `.env`, et s'arrête avec un message explicite si l'un des deux manque.

---

## Lot 1 — Service local Garmin

- [x] **T010** — Authentification et récupération brute des activités
  - Fichiers : `garmin-service/garmin_client.py`
  - Dépend de : T001
  - Couvre : CA1.1, CA1.2
  - Terminé quand : une fonction authentifie la session Garmin à partir des identifiants chargés, puis récupère la liste des activités postérieures à un epoch donné et le détail d'une activité par identifiant ; aucun appel d'écriture n'est jamais émis vers Garmin.
  - **Note** : utilise `garminconnect` (0.2.8), la bibliothèque que GarminDB utilise en interne (D2 du plan). API réelle inspectée par introspection (pas de documentation officielle Garmin). Vérifié avec des identifiants invalides : un vrai appel réseau part vers `sso.garmin.com`, échoue explicitement (401 propagé, jamais avalé). Un bug a été trouvé et corrigé pendant cette vérification : le client mis en cache était affecté avant confirmation du login, ce qui aurait empêché toute nouvelle tentative après un premier échec. Aucune méthode d'écriture (`upload_activity`) n'est appelée. Authentification réelle réussie non vérifiable sans compte Garmin vivant (reporté sur T012, comme T074 pour Strava en 001).

- [x] **T011** — Route `GET /activities` — **la route `/activities/:id` prévue a été retirée, voir note**
  - Fichiers : `garmin-service/main.py`
  - Dépend de : T010
  - Couvre : CA1.1, CA1.3, CA1.4, CA2.1
  - Terminé quand : une requête sur `127.0.0.1` renvoie du JSON correctement formé ; le serveur n'écoute que sur l'interface de boucle locale, jamais sur une interface réseau externe.
  - **Note** : `GET /activities?after=0` et une route inconnue (`/foo` → 404) répondent en JSON avec le bon code de statut ; une erreur Garmin est renvoyée en 502 avec un message, sans jamais faire planter le serveur. `HOST = "127.0.0.1"` uniquement (plan, section 5). La route `/activities/:id` initialement prévue a été retirée après T012 : `get_activity_details` (la seule méthode plausible de la bibliothèque) renvoie des séries de mesures (télémétrie), pas un résumé — voir note de T033 pour la correction retenue.

- [x] **T012** `[P]` — Vérification manuelle contre un compte Garmin réel
  - Fichiers : — (vérification, aucun fichier)
  - Dépend de : T011
  - Couvre : CA1.1, CA1.2
  - Terminé quand : une requête réelle contre un compte Garmin vivant renvoie des activités correctement formées ; non automatisable sans identifiants réels (plan, section 7).
  - **Note** : vérifié avec le compte Garmin réel de l'utilisateur (`.env` configuré par lui). `GET /activities?after=0` a renvoyé de vraies activités. **Deux erreurs d'hypothèse corrigées grâce à cette vérification** : (1) le schéma (T020) supposait un champ `duration` unique — la vraie réponse distingue `movingDuration` et `elapsedDuration`, corrigé dans `src/domain/schemas.ts` et `src/domain/activity.ts`, tests mis à jour ; (2) `get_activity_details` (prévu pour `/activities/:id`, T011) renvoie en réalité des séries de mesures, pas un résumé — voir T033. La table de correspondance des sports (T021) s'est révélée exacte sur les données réelles (course, trail, vélo, randonnée tous correctement classés).

---

## Lot 2 — Domaine : normalisation Garmin

- [x] **T020** `[P]` — Schéma de validation de la forme brute Garmin
  - Fichiers : `src/domain/schemas.ts`, `src/domain/schemas.test.ts`
  - Dépend de : —
  - Couvre : article V (constitution), CA2.3
  - Terminé quand : les tests démontrent qu'une forme brute valide passe, qu'un champ optionnel absent reste explicitement absent, et qu'une forme incomplète ou invalide est rejetée explicitement.
  - **Note** : seuls les champs dont le nom a été confirmé par introspection de `garminconnect` sont retenus (identifiant, nom, type, horodatages, distance, durée, dénivelé, fréquence cardiaque). Cadence, puissance et tracé GPS ne sont pas dans le schéma — noms de champs Garmin exacts non confirmés sans compte réel (plan, section 8). 4 tests, tous passants.

- [x] **T021** — Correspondance des types d'activité Garmin vers `SportKind`
  - Fichiers : `src/domain/activity.ts`, `src/domain/activity.test.ts`
  - Dépend de : T020
  - Couvre : CA2.2, CA2.3
  - Terminé quand : les tests couvrent la table de correspondance (course, vélo, randonnée), un type inconnu rattaché à « Autre » sans perte d'activité, et une valeur nulle ou absente normalisée en `null`, jamais `0`.
  - **Note** : table de correspondance construite à partir des valeurs `typeKey` documentées par la bibliothèque cliente, puis **confirmée exacte contre un vrai compte** (T012) : course à pied, trail (rattaché à « Course à pied », comme pour Strava), vélo et randonnée se sont tous classés correctement sur des activités réelles. 9 tests ajoutés (14 au total dans `activity.test.ts`), tous passants.

---

## Lot 3 — Intégration front

- [x] **T030** — Client Garmin côté navigateur
  - Fichiers : `src/data/garmin.ts` (nouveau), suppression de `src/data/strava.ts`
  - Dépend de : T011, T021
  - Couvre : CA1.1, CA1.3, CA1.4, CA2.1
  - Terminé quand : `src/data/garmin.ts` appelle les deux routes du service local, valide chaque réponse avec le schéma de T020 puis la normalise avec T021 ; `src/data/strava.ts` est supprimé et plus aucune référence n'y subsiste.
  - **Note** : contrairement à `strava.ts` (générateur asynchrone, pagination page par page), `garmin.ts` fait un seul `fetch` par appel — la pagination est déjà résolue côté service Python (T010/T011), qui renvoie la liste complète en une réponse. Ne couvre finalement que la liste (`/activities`) : voir la note de T033 pour pourquoi la route de détail a été abandonnée au profit d'une lecture depuis le cache local.

- [x] **T031** — Adaptation de la synchronisation
  - Fichiers : `src/data/sync.ts`
  - Dépend de : T030
  - Couvre : CA1.3, CA1.4
  - Terminé quand : `useSync` appelle le nouveau client à l'ouverture sans action de l'utilisateur, reprend depuis le curseur existant (`lastActivityStart`), et ne redemande jamais l'historique déjà obtenu.
  - **Note** : `useSync()` ne prend plus aucun argument (`accessToken`/`athleteId` disparus). **Bug réel trouvé et corrigé pendant la vérification en conditions réelles** : le service Python ne renvoyait pas d'en-tête CORS ; le navigateur bloquait la lecture de la réponse (`ERR_FAILED`) bien que la requête ait techniquement réussi, car `http://localhost:8788` (le tableau de bord) et `http://127.0.0.1:8799` (le service) sont deux origines distinctes du point de vue du navigateur. Corrigé en ajoutant `Access-Control-Allow-Origin: *` dans `garmin-service/main.py` — sans affaiblir la confidentialité, puisque le service n'écoute de toute façon que sur la boucle locale (D1 du plan). Vérifié de bout en bout avec des identifiants Garmin invalides : la requête atteint réellement Garmin, échoue explicitement, et l'échec s'affiche correctement via `SyncStatus` (« Erreur de synchronisation : ... ») sans bloquer l'interface.

- [x] **T032** — Suppression de `ConnectGate` et de la session chiffrée — **faite par anticipation, voir note**
  - Fichiers : `src/App.tsx`, suppression de `src/ui/ConnectGate.tsx`, suppression de `src/data/session.tsx`
  - Dépend de : T031
  - Couvre : décision 1 de la spec, D4 du plan
  - Terminé quand : `src/App.tsx` rend `AppRoutes` directement ; ni `ConnectGate.tsx` ni `session.tsx` n'existent plus ; le chargement initial et l'échec de récupération restent visibles via `Summary.tsx` (`EmptyState` « loading ») et `SyncStatus.tsx` (erreur, hors ligne).
  - **Note** : traitée avant T031 à la demande explicite de l'utilisateur (« nettoie tout le code en rapport avec Strava »), plutôt que dans l'ordre de dépendance prévu. `src/routes.tsx` a été mis à jour en conséquence (suppression de `useSession`, appel de `useSync()` sans argument, suppression de la route `/auth/done` devenue sans objet).

- [x] **T033** — Adaptation de `ActivityDetail` — **conception corrigée après vérification réelle (T012), voir note**
  - Fichiers : `src/ui/ActivityDetail.tsx`, `src/data/store.ts` (`getActivityById`)
  - Dépend de : T030, T032
  - Couvre : CA2.1, CA2.3
  - Terminé quand : le détail d'une sortie s'affiche avec ses indicateurs, sans appel à `useSession` (qui n'existe plus) ; une mesure optionnelle absente reste signalée comme absente, jamais inventée.
  - **Note** : la conception initiale (détail récupéré via une route réseau dédiée, `src/data/garmin.ts`) s'est révélée fausse à la vérification réelle (T012) : contrairement à Strava, la bibliothèque Garmin n'a pas d'appel qui renvoie le résumé d'une seule activité (`get_activity_details` renvoie des séries de mesures). Le plan et T011 ont été corrigés en conséquence : la route `/activities/:id` a été retirée, et `ActivityDetail.tsx` lit désormais l'activité depuis le cache local déjà synchronisé (`getActivityById`, `src/data/store.ts`) — les mêmes données, sans aller-retour réseau superflu, et cohérent avec CA1.4 (ne jamais redemander ce qui est déjà connu). Vérifié réellement : nom, date, distance, **durée déplacée et durée totale désormais distinctes** (1h14 vs 1h18), dénivelé, allure et fréquence cardiaque s'affichent correctement ; absence de tracé signalée honnêtement (« Aucun tracé disponible »). Le lien « Ouvrir sur Strava » reste retiré : aucun équivalent Garmin n'a été décidé.

- [x] **T034** `[P]` — Abandon de l'historique Strava en cache — **faite par anticipation, voir note**
  - Fichiers : `src/data/store.ts`
  - Dépend de : T033
  - Couvre : cas limite « historique Strava déjà présent localement » (spec, section 5)
  - Terminé quand : au premier chargement après cette mise à jour, aucune activité issue de Strava ne subsiste dans le cache local (base locale purgée ou reconstruite) ; seules des activités Garmin y apparaissent, sans collision d'identifiant entre les deux sources.
  - **Note** : traitée avant T033, en même temps que T032. Résolue en renommant `ACTIVITY_DATABASE_NAME` (`strava-dashboard` → `garmin-dashboard`) : la base IndexedDB au nouveau nom démarre nécessairement vide, ce qui abandonne de fait tout historique Strava sans avoir à écrire de logique de purge dédiée.

---

## Lot 4 — Suppression du dispositif Strava/serverless

- [x] **T040** `[P]` — Suppression de la fonction serverless d'authentification
  - Fichiers : suppression du dossier `functions/api/auth/`, vérification de `wrangler.toml`
  - Dépend de : T032
  - Couvre : D4 du plan
  - Terminé quand : `functions/api/auth/` n'existe plus ; `npm run build` ne référence plus aucune route d'authentification.
  - **Note** : `functions/api/health.ts` (sans rapport avec Strava) a été laissé intact. `src/data/quota.ts` et `src/data/quota.test.ts` (fenêtre de quota spécifique à Strava, article IV désormais sans objet) ont été supprimés au même moment, n'ayant plus aucun appelant après la suppression de `strava.ts`. Renommages cosmétiques associés : `wrangler.toml`, `package.json`, `.claude/launch.json` (`dashboard-strava` → `dashboard-garmin`), `index.html` (titre). `.dev.vars.example` a été supprimé (ne portait que des secrets Strava désormais sans objet) ; le `.dev.vars` réel de l'utilisateur, non suivi par git, n'a pas été touché.

---

## Lot 5 — Vérification finale

- [x] **T050** — Suite de vérification statique et unitaire
  - Fichiers : — (vérification, aucun fichier)
  - Dépend de : T034, T040
  - Couvre : article V, article VI
  - Terminé quand : `npx tsc --noEmit`, `npm run lint` et `npm run test` passent tous, sans référence résiduelle à Strava, à `useSession` ou à `functions/api/auth`.
  - **Note** : `tsc`, `eslint`, `npm run test` (71 tests) et `npm run build` passent tous. Recherche explicite des références restantes à « Strava » : seuls `src/domain/schemas.ts`, `src/domain/activity.ts` et `src/domain/activity.test.ts` (le normaliseur Strava conservé volontairement comme gabarit, voir note de nettoyage) et un commentaire historique dans `src/data/store.ts` subsistent — aucune référence cassée, aucun appel à `useSession` ni à `functions/api/auth`.

- [x] **T051** — Vérification manuelle de bout en bout
  - Fichiers : — (vérification, aucun fichier)
  - Dépend de : T050, T012
  - Couvre : CA1.1, CA1.2, CA1.3, CA1.4, CA2.1, cas limites « récupération échouée », « compte Garmin vide », « type inconnu », « position GPS absente »
  - Terminé quand : le service local démarré et un compte Garmin réel configuré, l'ouverture du tableau de bord affiche les activités Garmin sur toutes les vues existantes ; l'arrêt du service local produit l'état d'échec déjà spécifié sans blocage de l'interface.
  - **Note** : vérifié avec le compte Garmin réel de l'utilisateur. Toutes les vues existantes affichent correctement les vraies activités : synthèse de période avec comparaison, répartition par jour, liste triable (course, trail, vélo, randonnée tous bien classés), graphique de progression, détail d'une sortie (durée déplacée/écoulée désormais distinctes). Cas « récupération échouée » vérifié séparément avec des identifiants invalides (401 explicite, affiché sans blocage). Cas « compte Garmin vide » et « position GPS absente sur une activité avec position » non rencontrés sur ce compte (toutes les activités testées avaient une position) — couverts par construction (même logique que Strava, inchangée) plutôt que par observation directe. Deux erreurs de conception corrigées pendant cette vérification, détaillées aux notes de T011/T012/T033.

- [x] **T052** — Mise à jour de la documentation projet
  - Fichiers : `CLAUDE.md`
  - Dépend de : T051
  - Couvre : — (hygiène documentaire)
  - Terminé quand : la section « État actuel » de `CLAUDE.md` reflète le passage à Garmin, sans mention obsolète du flux de connexion Strava.
  - **Note** : section « État actuel » et « Contexte technique retenu » réécrites ; mention explicite que l'article IV de la constitution est sans objet plutôt que corrigé silencieusement ; les deux erreurs de conception corrigées pendant T012/T051 y sont résumées avec renvoi vers les notes détaillées de `tasks.md`.

---

## Couverture des critères d'acceptation

| Critère | Couvert par |
|---------|-------------|
| CA1.1 | T010, T011, T012, T030, T051 |
| CA1.2 | T010, T012 |
| CA1.3 | T011, T030, T031, T051 |
| CA1.4 | T011, T030, T031, T051 |
| CA2.1 | T011, T030, T033, T051 |
| CA2.2 | T021 |
| CA2.3 | T020, T021, T033 |

Aucun critère d'acceptation de `spec.md` n'est laissé sans tâche.

---

## Suivi

| Lot | Tâches | Terminées | État |
|-----|--------|-----------|------|
| 0 — Socle | T001 | 1 / 1 | Terminé |
| 1 — Service local Garmin | T010–T012 | 3 / 3 | Terminé |
| 2 — Domaine | T020–T021 | 2 / 2 | Terminé |
| 3 — Intégration front | T030–T034 | 5 / 5 | Terminé |
| 4 — Suppression Strava/serverless | T040 | 1 / 1 | Terminé |
| 5 — Vérification finale | T050–T052 | 3 / 3 | Terminé |

**Total : 15 tâches — 15 terminées.** Vérifié contre un vrai compte Garmin
(T012, T051), avec deux corrections de conception documentées dans les notes
de T011/T012/T033. Cadence, puissance et tracé GPS restent hors périmètre
(décision 5 de la spec).
