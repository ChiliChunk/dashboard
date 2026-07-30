# Plan technique — Source de données Garmin pour le tableau de bord

**Spec source** : `specs/002-source-garmin/spec.md` (statut : Validée)
**Statut** : Validé
**Date** : 2026-07-29 (rédaction) · 2026-07-29 (validation)

> Ce document répond au **comment**. Il ne réinvente aucun besoin : tout ce qu'il
> construit doit se rattacher à un critère d'acceptation de la spec.

---

## 1. Conformité à la constitution

| Article | Respecté | Justification |
|---------|----------|----------------|
| I — La spécification fait foi | Oui | Chaque composant de la section 2 est rattaché à un ou plusieurs critères d'acceptation de `specs/002-source-garmin/spec.md`. |
| II — Aucun secret n'atteint le navigateur | Oui | Les identifiants Garmin ne vivent que dans le fichier `.env` du service local (jamais lu par le navigateur). Le navigateur ne reçoit que des activités déjà normalisées, jamais un identifiant ni un secret. Voir D1, D4. |
| III — Coût d'exploitation nul | Oui | Tout s'exécute sur la machine de l'utilisateur : aucun hébergement, aucune machine distante allumée en permanence. Voir D1. |
| IV — Le quota Strava est une ressource rare | **Sans objet** | Strava n'est plus utilisé comme source de données (décision 3 de la spec). Voir remarque en section 8 sur l'amendement de la constitution. |
| V — Typage strict, données validées aux frontières | Oui | Le domaine TypeScript existant (`strict`, `noUncheckedIndexedAccess`) est réutilisé sans changement. Un schéma dédié valide la forme brute renvoyée par le service Garmin, exactement comme pour Strava. Voir D3. |
| VI — Logique métier testée, interface vérifiée | Oui | Toute la logique de conversion (catégorie de sport, unités, valeurs manquantes) reste dans `src/domain/`, testée par Vitest. Le service local ne porte aucun calcul. Voir D3, section 7. |
| VII — Une dataviz qui ment est un bug | Oui | Aucune vue ne change de comportement (CA2.1) : les mêmes règles d'affichage déjà vérifiées pour Strava s'appliquent aux données Garmin. |
| VIII — Frugalité des dépendances | Oui | Aucune dépendance JS supplémentaire côté navigateur. Côté service local, une seule dépendance externe est ajoutée pour parler à Garmin Connect. Voir D2, section 3. |

---

## 2. Vue d'ensemble

Deux composants, tous deux exécutés **sur la machine de l'utilisateur** — plus
aucun composant distant.

```
┌───────────────────────────────────────────────────┐
│  Machine de l'utilisateur                          │
│                                                     │
│  Application statique (React) — inchangée          │
│    │                                               │
│    ├── IndexedDB : activités + curseur de sync    │
│    └── domaine : agrégats, filtres, tracés         │
│         │                                          │
│         │ GET http://127.0.0.1:<port>/activities   │
│         ▼                                          │
│  Service local Garmin (Python)                     │
│    ├── identifiants Garmin lus depuis .env         │
│    │   (jamais transmis au navigateur)             │
│    └── appelle Garmin Connect pour le compte       │
│        déjà configuré                              │
└───────────────────────────────────────────────────┘
```

Le point structurant : **il n'y a plus de composant distant du tout**. La
fonction serverless et le flux OAuth de la fonctionnalité 001 disparaissent
entièrement (décision 1 de la spec — aucune démarche de connexion). Le
service Python ne fait que ce que faisait `functions/api/auth/*` en partie
(détenir un secret hors de portée du navigateur) et ce que faisait
`src/data/strava.ts` (fournir des activités) — mais en local, sans jeton, sans
session.

**Rattachement des composants aux critères**

| Composant | Rôle | Critères couverts |
|-----------|------|--------------------|
| Service local Garmin (nouveau, Python) | Authentifie l'accès Garmin via `.env`, récupère les activités récentes, les expose en local | CA1.1, CA1.2, CA1.3, CA1.4 |
| `src/data/garmin.ts` (remplace `src/data/strava.ts`) | Client HTTP vers le service local (liste incrémentale et détail d'une activité) | CA1.1, CA1.3, CA1.4, CA2.1 |
| `src/domain/schemas.ts` (étendu) | Schéma de validation de la forme brute Garmin, à la frontière | article V, CA2.3 |
| `src/domain/activity.ts` (étendu) | Normalisation Garmin → `Activity`, correspondance des catégories de sport | CA2.2, CA2.3 |
| `src/data/store.ts` | Persistance IndexedDB, curseur de synchronisation — **inchangé** | CA1.4 |
| `src/data/sync.ts` (adapté) | Récupération automatique à l'ouverture, reprise incrémentale | CA1.3, CA1.4 |
| `src/ui/Summary.tsx`, `PeriodHeader.tsx`, `DayBreakdown.tsx`, `ActivityList.tsx`, `VolumeChart.tsx` | Vues déjà existantes — **inchangées** | CA2.1 |
| `src/ui/ActivityDetail.tsx` (adapté) | Détail d'une sortie ; n'appelle plus `useSession`, utilise `src/data/garmin.ts` directement | CA2.1, CA2.3 |

**Supprimé** (n'a plus de rôle, décision 1 de la spec) : `functions/api/auth/*`
dans son intégralité, `src/data/session.tsx` (`SessionProvider`/`useSession`),
et `src/ui/ConnectGate.tsx` — le chargement initial et l'échec de récupération
restent visibles via les états déjà gérés par `Summary.tsx` (`EmptyState`
« loading ») et `SyncStatus.tsx` (erreur, hors ligne, quota), sans composant
dédié supplémentaire.

---

## 3. Stack et dépendances

| Dépendance | Rôle | Côté | Alternative écartée et pourquoi |
|------------|------|------|----------------------------------|
| Bibliothèque cliente Garmin Connect non officielle (celle utilisée en interne par l'outil GarminDB initialement envisagé) | Authentification et récupération des activités depuis Garmin Connect | Service local (Python) | Voir D2 : l'outil GarminDB complet est écarté au profit de sa seule brique d'accès. |
| Lecture de fichier `.env` (bibliothèque standard de gestion de variables d'environnement) | Charger les identifiants Garmin hors du code source | Service local (Python) | Coder à la main l'analyse d'un fichier `.env` : quelques lignes, mais dupliquerait un besoin déjà résolu de façon fiable ; retenu si le poids reste négligeable, sinon remplacé par une analyse manuelle triviale. |
| Serveur HTTP — bibliothèque standard du langage, sans framework | Exposer `GET /activities` en local | Service local (Python) | Un framework web (par exemple Flask) : justifié seulement si le nombre de routes croît ; pour une seule route, la bibliothèque standard suffit et évite une dépendance (article VIII, appliqué aussi côté service local). |

**Aucune dépendance JavaScript supplémentaire** : `src/data/garmin.ts` est un
appel `fetch` vers `http://127.0.0.1:<port>/activities`, du même ordre que
`src/data/strava.ts` qu'il remplace.

---

## 4. Modèle de données

### `Activity` — inchangé

La forme normalisée du domaine (`src/domain/types.ts`) ne change pas : c'est
la condition de CA2.1 (les vues existantes fonctionnent à l'identique). Seule
la **source** qui alimente cette forme change.

### Correspondance des catégories de sport (CA2.2)

`SportKind` reste `run | ride | hike | other`, sans catégorie supplémentaire
(décision 4 de la spec).

| Valeur `SportKind` | Types d'activité Garmin rattachés | Libellé affiché |
|---------------------|-------------------------------------|------------------|
| `run` | course à pied, course sur tapis, course en sentier, course virtuelle | Course à pied |
| `ride` | vélo route, VTT, gravel, vélo virtuel, vélo d'intérieur | Vélo |
| `hike` | randonnée | Randonnée |
| `other` | tout le reste | Autre |

Les libellés exacts renvoyés par la bibliothèque cliente Garmin (clé de type
d'activité) seront confirmés contre de vraies réponses à l'implémentation ;
toute valeur non reconnue à ce moment-là tombe déjà sur `other`, donc aucune
activité n'est jamais perdue (CA2.2, CA2.3).

### `SyncCursor` — simplifié

Le curseur de synchronisation (`src/data/store.ts`) est conservé tel quel
(`lastActivityStart`, `lastSyncAt`, `complete`). Le champ `athleteId`, qui
cloisonnait le cache par compte Strava, perd sa raison d'être : la spec ne
prévoit qu'un seul compte Garmin (section 3, périmètre exclu). Il est
conservé sous un nom générique (`accountId`) mais prend toujours la même
valeur — aucun cloisonnement multi-compte n'est implémenté.

---

## 5. Contrats d'interface

### Service local Garmin

Deux routes, aucune authentification au niveau HTTP : le service n'écoute
que sur l'interface de boucle locale (`127.0.0.1`), jamais sur une interface
réseau accessible depuis l'extérieur de la machine — c'est ce qui tient
l'exigence de confidentialité de la spec (section 6) sans avoir besoin d'un
jeton côté navigateur.

| Route | Méthode | Entrée | Sortie | Critères |
|-------|---------|--------|--------|----------|
| `GET /activities` | GET | `after` (epoch, optionnel) | Liste JSON des activités Garmin postérieures à `after`, forme brute peu remaniée | CA1.1, CA1.3, CA1.4 |
| `GET /activities/:id` | GET | `id` (identifiant Garmin de l'activité) | Détail JSON d'une activité, forme brute peu remaniée | CA2.1 (vue détail d'une sortie) |

La seconde route existe pour la même raison que `GET /activities/:id` côté
Strava dans la fonctionnalité 001 : `src/ui/ActivityDetail.tsx` a besoin du
détail d'une sortie précise, indépendamment de la liste incrémentale.

Aucune route de connexion, de déconnexion ou de session : conforme à la
décision 1 de la spec (aucune démarche de connexion visible dans
l'application).

### Client Garmin — `src/data/garmin.ts`

| Appel | Usage | Critères |
|-------|-------|----------|
| `GET http://127.0.0.1:<port>/activities?after=<epoch>` | Récupération incrémentale à chaque ouverture | CA1.3, CA1.4 |

Remplace exactement l'appel `GET /athlete/activities?...&after=<epoch>&page=<n>`
de `src/data/strava.ts`. La pagination par page n'est conservée que si le
volume d'activités Garmin le justifie à l'implémentation ; sinon une seule
page suffit et la pagination est simplifiée.

### Paramètres d'URL

Inchangés (`/`, `/activity/:id`) ; `/auth/done` disparaît puisqu'il n'y a plus
de retour de connexion à gérer.

---

## 6. Décisions d'architecture

### D1 — Exécution entièrement locale, abandon de l'hébergement distant

- **Contexte** : la spec impose un coût nul strict (décision 6) et une
  configuration d'accès Garmin entièrement hors de l'application (décision 1).
  Le tableau de bord n'a qu'un seul utilisateur (section 2 de la spec).
- **Options envisagées** :
  - *(i)* Conserver le tableau de bord hébergé à distance (Cloudflare Pages) et
    exposer le service Garmin local via un relais public. Coût et surface
    d'attaque disproportionnés pour un usage strictement personnel ; contredit
    l'esprit de confidentialité de la section 6 de la spec.
  - *(ii)* Tout exécuter sur la même machine, communication limitée à
    `http://127.0.0.1`.
- **Décision** : *(ii)*.
- **Conséquences acceptées** : le tableau de bord n'est consultable que depuis
  la machine où tourne le service Garmin. Ce n'est pas demandé par la spec
  actuelle (aucun scénario ne mentionne un accès distant) ; à reconsidérer si
  un tel besoin apparaît un jour.

### D2 — Bibliothèque d'accès Garmin seule, plutôt que l'outil GarminDB complet

- **Contexte** : l'outil nommé au départ pour cette fonctionnalité synchronise
  vers des bases SQLite locales et couvre aussi le sommeil, le stress, la
  fréquence cardiaque au repos et le « body battery » — autant de mesures
  explicitement hors périmètre (décision 5 de la spec). Il introduirait de
  plus une seconde couche de persistance, alors que `src/data/store.ts`
  (IndexedDB) assure déjà ce rôle côté application.
- **Options envisagées** :
  - *(i)* L'outil complet, lu ensuite par le service local. Poids et périmètre
    largement supérieurs au besoin ; persistance dupliquée.
  - *(ii)* La seule bibliothèque cliente Garmin Connect que cet outil utilise
    en interne, appelée directement pour ne récupérer que la liste des
    activités.
- **Décision** : *(ii)*.
- **Conséquences acceptées** : aucune donnée de bien-être n'est disponible
  sans reprendre cette décision. Si une fonctionnalité future veut les
  exploiter, elle devra la rouvrir explicitement plutôt que d'en hériter
  silencieusement.

### D3 — Normalisation en TypeScript, service local en simple transport

- **Contexte** : l'article VI interdit tout calcul hors du domaine testé,
  l'article V impose une validation aux frontières.
- **Décision** : le service local renvoie les activités Garmin sous une forme
  brute peu remaniée. `src/domain/schemas.ts` et `src/domain/activity.ts`
  sont étendus d'un schéma et d'une correspondance de catégories dédiés à
  Garmin, selon exactement le même patron que celui déjà en place pour Strava
  (`parseStravaActivity` → `normalizeActivity`).
- **Conséquences acceptées** : le service local reste volontairement peu
  sophistiqué (pas de règle métier à y maintenir ni à y tester séparément) ;
  toute la logique de conversion reste couverte par les tests Vitest déjà en
  place, sans nouvelle stratégie de test à inventer.

### D4 — Suppression du dispositif serverless et de la session chiffrée

- **Contexte** : la décision 1 de la spec écarte toute démarche de connexion
  dans l'application. Le dispositif de la fonctionnalité 001
  (`functions/api/auth/*`, cookie de session chiffré, `SessionProvider`) n'a
  plus d'objet : il n'y a plus de jeton à échanger, ni de secret à protéger
  côté navigateur de cette façon.
- **Décision** : suppression complète de `functions/api/auth/`, de
  `src/data/session.tsx` et de `src/ui/ConnectGate.tsx`. `src/App.tsx` rend
  `AppRoutes` directement ; le chargement initial et l'échec de récupération
  restent déjà couverts par `Summary.tsx` (`EmptyState` « loading ») et
  `SyncStatus.tsx` (erreur, hors ligne, quota), sans avoir besoin d'un
  composant de garde dédié.
- **Conséquences acceptées** : `wrangler pages dev` et les fonctions Cloudflare
  Pages ne sont plus nécessaires pour cette fonctionnalité. Si un usage
  distant redevient un jour pertinent, ce choix — et D1 — devront être
  rouverts ensemble.

---

## 7. Stratégie de test

**Couverts par Vitest, sans exception** (article VI) :

| Module | Ce qui est vérifié |
|--------|----------------------|
| `domain/activity.ts` (étendu) | Correspondance des types d'activité Garmin vers `SportKind` ; type inconnu → `other` ; valeur nulle ou absente → `null`, jamais `0` |
| `domain/schemas.ts` (étendu) | Rejet explicite d'une forme brute Garmin invalide ou incomplète |
| `data/store.ts`, `data/sync.ts` | Inchangés, déjà couverts par la fonctionnalité 001 — aucune régression attendue, à reconfirmer par la suite de tests existante |

**Vérifié manuellement, sans couverture automatisée** : la connexion réelle du
service local à un compte Garmin vivant (identifiants réels requis, comme le
parcours Strava de la fonctionnalité 001 ne pouvait l'être).

**Non couvert, et assumé** : aucun test automatisé du service Python
lui-même au-delà d'une vérification manuelle de son unique route — il ne
porte aucune logique justifiant une suite de tests dédiée (D3).

---

## 8. Risques

| Risque | Probabilité | Impact | Parade |
|--------|-------------|--------|--------|
| La bibliothèque cliente Garmin non officielle change de comportement sans préavis (API non documentée par Garmin) | Moyenne | Moyen | Validation stricte à la frontière (article V) : une forme inattendue échoue explicitement plutôt que de corrompre les données affichées. |
| Le service local n'est pas démarré au moment où le tableau de bord s'ouvre | Élevée | Faible | Traité comme le cas limite « récupération échouée » déjà spécifié : dernières données en cache affichées, échec signalé sans blocage. |
| La correspondance exacte des types d'activité Garmin n'est pas connue avec certitude à ce stade | Moyenne | Faible | Table de correspondance à confirmer contre de vraies réponses lors de l'implémentation ; toute valeur non reconnue tombe déjà sur « Autre », sans perte d'activité. |
| La constitution reste rédigée autour de Strava (article IV nommément) alors que cette fonctionnalité l'abandonne | Faible | Faible | Signalé ici sans y toucher : un amendement explicite de la constitution (article « Amendements ») serait cohérent, mais reste une décision de gouvernance distincte de ce plan. |
| Le tableau de bord n'est plus consultable que depuis la machine du service local (D1) | Élevée (assumé) | Faible | Conforme au périmètre mono-utilisateur de la spec ; à revoir seulement si un accès distant devient un jour un besoin exprimé. |
