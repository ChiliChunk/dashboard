# Plan technique — Dashboard de visualisation des sorties sportives Strava

**Spec source** : `specs/001-dashboard-strava/spec.md` (statut : Validée, amendée le 2026-07-29)
**Référence visuelle** : `specs/001-dashboard-strava/design/maquette-tableau-de-bord.html`
**Statut** : Validé
**Date** : 2026-07-29 (rédaction) · 2026-07-29 (validation)

---

## 1. Conformité à la constitution

| Article | Respecté | Justification |
|---------|----------|---------------|
| I — La spécification fait foi | Oui | Chaque composant de la section 2 est rattaché à un ou plusieurs critères d'acceptation. Aucun composant n'existe sans rattachement. |
| II — Aucun secret n'atteint le navigateur | Oui | Le `client_secret` ne réside que dans les variables secrètes de la fonction serverless. Le `refresh_token` ne revient jamais au JavaScript : il est chiffré et transporté par un cookie `HttpOnly`. L'`access_token`, de courte durée, vit en mémoire JS uniquement et n'est jamais persisté. Voir D1. |
| III — Coût d'exploitation nul | Oui | Cloudflare Pages (site statique) + Pages Functions (scale-to-zero, 100 000 requêtes/jour en palier gratuit). Aucune base de données managée, aucun processus permanent. Le stockage des activités est local au navigateur. |
| IV — Le quota Strava est une ressource rare | Oui | Synchronisation incrémentale par curseur `after`, pagination à 200 éléments, compteur de fenêtre glissante côté client, lecture des en-têtes de quota renvoyés par Strava. Voir D6. |
| V — Typage strict, données validées aux frontières | Oui | TypeScript `strict` + `noUncheckedIndexedAccess`. Validation par schéma sur les trois frontières : réponses de l'API Strava, contenu lu depuis IndexedDB, paramètres d'URL. |
| VI — Logique métier testée, interface vérifiée | Oui | Le domaine (`src/domain/`) ne contient aucun élément de rendu et est couvert par Vitest : agrégats, conversions, décodage de tracé, découpage temporel, filtres. Voir section 7. |
| VII — Une dataviz qui ment est un bug | Oui | Graphique construit à la main en SVG : axes non tronqués, unités affichées, absence de donnée distinguée du zéro (CA5.4), double encodage couleur + motif pour la répartition par sport (ENF6). Voir D3. |
| VIII — Frugalité des dépendances | Oui | 7 dépendances runtime, chacune justifiée en section 3. Le graphique, le décodage de tracé et la gestion d'état sont écrits à la main plutôt qu'importés. |

**Écart résolu** : CA4.1 (fond cartographique) et ENF2 (aucun tiers hors Strava)
étaient en tension. Résolu par D5 — fond de carte activable à la demande,
désactivé par défaut, avec mention explicite. Arbitré par l'utilisateur le
2026-07-29.

---

## 2. Vue d'ensemble

Trois composants, dont un seul s'exécute hors du navigateur.

```
┌─────────────────────────────────────────────────┐
│  Navigateur                                     │
│                                                 │
│  Application statique (React)                   │
│    │                                            │
│    ├── access_token en mémoire, jamais persisté │
│    ├── IndexedDB : activités + curseur de sync  │
│    └── domaine : agrégats, filtres, tracés      │
│         │                          │            │
└─────────┼──────────────────────────┼────────────┘
          │ cookie HttpOnly          │ access_token
          ▼                          ▼
┌──────────────────────┐   ┌────────────────────────┐
│  Pages Function      │   │  API Strava            │
│  /api/auth/*         │──▶│  oauth/token           │
│                      │   │                        │
│  client_secret       │   │  athlete/activities    │◀── appelée
│  clé de chiffrement  │   │  activities/:id        │    directement
│  SANS ÉTAT           │   └────────────────────────┘    par le front
└──────────────────────┘
```

Le point structurant : **les données d'activité ne transitent jamais par la
fonction serverless**. Celle-ci ne voit que des jetons. Le front interroge
l'API Strava directement avec l'`access_token`. C'est ce qui permet de tenir
ENF2 et ENF3 simultanément — la fonction n'est sollicitée qu'à la connexion et
au renouvellement de jeton, soit quelques requêtes par jour et par utilisateur.

**Rattachement des composants aux critères**

| Composant | Rôle | Critères couverts |
|-----------|------|-------------------|
| `functions/api/auth/*` | Échange et renouvellement de jetons, détention du secret | CA1.2, CA1.3, CA1.4, CA1.5, CA1.6, ENF1, ENF3 |
| `src/data/strava.ts` | Client de l'API Strava, pagination, quota | CA6.2, CA6.5, cas « quota atteint », cas « autorisation révoquée » |
| `src/data/store.ts` | Persistance IndexedDB, curseur de synchronisation | CA6.1, CA6.2, CA6.3, CA6.4, CA1.6 |
| `src/domain/activity.ts` | Normalisation, validation, valeurs manquantes | CA4.4, cas « activité manuelle », « type inconnu », « valeur aberrante » |
| `src/domain/aggregate.ts` | Agrégats, comparaison de périodes, répartition | CA2.1, CA2.2, CA2.3, CA2.4 |
| `src/domain/filter.ts` | Filtrage, tri | CA3.2, CA3.3, CA3.5, ENF5 |
| `src/domain/timeline.ts` | Découpage semaine/mois, creux réels | CA5.1, CA5.2, CA5.3, CA5.4 |
| `src/domain/polyline.ts` | Décodage du tracé encodé | CA4.1 |
| `src/domain/units.ts` | Allure, vitesse, formatage, unités | CA2.6, CA4.5 |
| `src/ui/PeriodHeader.tsx` | Bandeau de période, bornes de dates, filtres de sport | CA2.9, CA3.2, CA3.4 |
| `src/ui/Summary.tsx` | Vue de synthèse, cartes de métriques | CA2.1 → CA2.6 |
| `src/ui/DayBreakdown.tsx` | Répartition jour par jour de la semaine en cours | CA2.7, CA2.8 |
| `src/ui/ActivityList.tsx` | Liste virtualisée, filtres, tri | CA3.1 → CA3.7 |
| `src/ui/ActivityDetail.tsx` | Détail et tracé | CA4.1 → CA4.6 |
| `src/ui/VolumeChart.tsx` | Graphique de progression, barres ventilées par sport | CA5.1 → CA5.8 |
| `src/ui/theme.css` | Jetons visuels dérivés de la maquette | ENF6, ENF8, décisions Q10 et Q11 |
| `src/ui/SyncStatus.tsx` | Progression, date de sync, resynchronisation | CA6.3, CA6.4, CA6.5 |
| `src/ui/EmptyState.tsx` | États vides distincts du chargement | CA2.5, CA3.7, cas « compte sans activité » |

---

## 3. Stack et dépendances

| Dépendance | Rôle | Poids (gzip) | Alternative écartée et pourquoi |
|------------|------|--------------|----------------------------------|
| `react` + `react-dom` | Rendu | ~45 ko | Aucune : socle assumé. |
| `wouter` | Routage (3 routes) | ~2 ko | `react-router` (~20 ko) fait dix fois plus que nécessaire pour trois routes. |
| `valibot` | Validation aux frontières (art. V) | ~3 ko utilisés | `zod` (~13 ko) : même service, empreinte quadruple, non tree-shakable à ce niveau. |
| `idb` | Enveloppe IndexedDB fondée sur les promesses | ~1,2 ko | API IndexedDB brute : fonctionne, mais son style à base d'événements produit un code de persistance nettement plus difficile à tester. |
| `@tanstack/react-virtual` | Virtualisation de la liste (CA3.6) | ~5 ko | Pagination : dégrade l'exploration ; rendu complet de 5 000 lignes : viole ENF5. |
| `date-fns` | Découpage semaine/mois, comparaison de périodes | ~4 ko utilisés | Calculs maison : les semaines ISO et les changements d'heure sont une source classique d'erreurs silencieuses, exactement le genre que l'article VII interdit. `Temporal` : support Safari encore incomplet. |
| `leaflet` | Fond cartographique (CA4.1) | ~42 ko | Sous réserve de l'arbitrage D5. `maplibre-gl` (~200 ko) est disproportionné pour l'affichage d'un tracé statique. |

**Écrits à la main plutôt qu'importés** : le graphique (D3), le décodage de
tracé, la gestion d'état, le formatage d'unités. Total évité : environ 120 ko.

**Outillage** : Vite 6, TypeScript 5 en mode `strict`, Vitest, ESLint.
Déploiement Cloudflare Pages, développement local via `wrangler pages dev`.

---

## 4. Modèle de données

### `Activity` — forme normalisée du domaine

| Champ | Type | Unité | Obligatoire | Source |
|-------|------|-------|-------------|--------|
| `id` | `number` | — | oui | `id` |
| `name` | `string` | — | oui | `name` |
| `sport` | `SportKind` | — | oui | `sport_type`, réduit à un ensemble fermé |
| `sportRaw` | `string` | — | oui | `sport_type` brut, conservé pour la catégorie « Autre » |
| `startedAt` | `Date` | — | oui | `start_date` (UTC) |
| `startedAtLocal` | `Date` | — | oui | `start_date_local` |
| `distance` | `number \| null` | mètres | non | `distance`, `null` si ≤ 0 |
| `movingTime` | `number \| null` | secondes | non | `moving_time`, `null` si ≤ 0 |
| `elapsedTime` | `number \| null` | secondes | non | `elapsed_time` |
| `elevationGain` | `number \| null` | mètres | non | `total_elevation_gain` |
| `averageHeartrate` | `number \| null` | bpm | non | présent seulement si `has_heartrate` |
| `averageWatts` | `number \| null` | watts | non | absent sur la plupart des activités |
| `averageCadence` | `number \| null` | tr/min | non | absent sur la plupart des activités |
| `polyline` | `string \| null` | — | non | `map.summary_polyline`, `null` si vide |
| `isManual` | `boolean` | — | oui | `manual` |

**Règle de normalisation** (cas « valeur aberrante » et « activité manuelle ») :
toute grandeur nulle, négative ou absente devient `null`, jamais `0`. Cette
distinction est la condition de CA2.5, CA4.4 et CA5.4 — l'interface doit pouvoir
afficher « non mesuré » là où un zéro serait un mensonge.

`SportKind` compte quatre valeurs : `run | ride | hike | other` (décision Q9).

| Valeur | `sport_type` Strava rattachés | Libellé affiché |
|--------|-------------------------------|-----------------|
| `run` | `Run`, `TrailRun`, `VirtualRun` | Course à pied |
| `ride` | `Ride`, `MountainBikeRide`, `GravelRide`, `EBikeRide`, `VirtualRide` | Vélo |
| `hike` | `Hike` | Randonnée |
| `other` | tout le reste | Autre |

Le trail est délibérément fusionné dans `run` : la distinction n'apporte rien aux
agrégats attendus et fragmenterait les légendes. `sportRaw` conserve toujours la
valeur d'origine, de sorte que la fusion reste réversible sans resynchronisation.

`other` n'est pas un choix mais une nécessité : le cas limite « activité de type
inconnu » interdit d'ignorer une activité. La catégorie n'apparaît dans aucune
légende tant qu'aucune activité ne s'y rattache.

### `SyncCursor` — état de synchronisation

| Champ | Type | Rôle |
|-------|------|------|
| `athleteId` | `number` | Cloisonne le cache si le compte change |
| `lastActivityStart` | `number` | Epoch de l'activité la plus récente connue, curseur `after` de CA6.2 |
| `lastSyncAt` | `number` | Epoch de la dernière synchronisation réussie (CA6.3) |
| `complete` | `boolean` | Faux tant que la première synchronisation intégrale n'est pas terminée (CA6.5) |

### Schéma IndexedDB

Base `strava-dashboard`, version 1, deux magasins :
`activities` (clé primaire `id`, index sur `startedAt` et `sport`) et
`meta` (clé/valeur, contient le `SyncCursor`).

La suppression de la base entière est l'implémentation de CA1.6.

---

## 5. Contrats d'interface

### Fonction serverless — `functions/api/auth/`

Quatre routes, aucune ne voit de donnée d'activité.

| Route | Méthode | Entrée | Sortie | Critères |
|-------|---------|--------|--------|----------|
| `/api/auth/start` | GET | `return_to` (chemin relatif) | 302 vers Strava, `scope=activity:read`, cookie `sdd_state` (anti-CSRF, 10 min) | CA1.2, CA1.3 |
| `/api/auth/callback` | GET | `code`, `state`, ou `error` | 302 vers `return_to`, pose `sdd_session` | CA1.3, CA1.4 |
| `/api/auth/token` | POST | cookie `sdd_session` | `{ accessToken, expiresAt, athleteId }` ou 401 | CA1.5, cas « session expirée », cas « autorisation révoquée » |
| `/api/auth/logout` | POST | — | 204, cookie effacé | CA1.6 |

**Cookie `sdd_session`** : `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=15552000`.
Contenu : `refresh_token` chiffré en AES-GCM (WebCrypto), la clé provenant d'une
variable secrète de la fonction. Le JavaScript de la page ne peut ni le lire ni
l'exfiltrer — c'est l'implémentation littérale de ENF1 et de l'article II.

**`scope=activity:read`** et non `activity:read_all` : les activités privées
restent hors de portée, et aucune permission d'écriture n'est demandée (CA1.2).

### Client Strava — appelé directement depuis le navigateur

| Appel | Usage | Critères |
|-------|-------|----------|
| `GET /athlete/activities?per_page=200&after=<epoch>&page=<n>` | Synchronisation incrémentale | CA6.2, CA6.5 |
| `GET /activities/:id` | Détail, indicateurs optionnels | CA4.3, CA4.4 |

Les en-têtes `X-RateLimit-Usage` et `X-RateLimit-Limit` sont lus à chaque
réponse et alimentent le compteur décrit en D6.

### Paramètres d'URL

`/` (synthèse et liste), `/activity/:id` (détail), `/auth/done` (retour de
connexion). Les filtres actifs sont sérialisés en chaîne de requête
(`?sport=run&from=2026-01-01`) pour que CA3.4 survive à un rechargement — et
validés par schéma à la lecture (article V).

---

## 6. Décisions d'architecture

### D1 — Fonction serverless sans état, jeton de rafraîchissement en cookie chiffré

- **Contexte** : l'API Strava exige le `client_secret` pour l'échange initial *et* pour chaque renouvellement. ENF1 interdit sa présence côté navigateur, ENF3 interdit un serveur permanent, CA1.5 impose une session durable.
- **Options envisagées** :
  - *(i)* Fonction serverless + stockage de session en Cloudflare KV. Fonctionne, mais introduit un état à administrer, une durée de rétention à gérer, et un service supplémentaire.
  - *(ii)* Fonction serverless sans état, le `refresh_token` chiffré voyageant dans un cookie `HttpOnly`. Le navigateur transporte le jeton sans jamais pouvoir le lire.
  - *(iii)* Front et fonction sur deux domaines distincts. Impose `SameSite=None` et une configuration CORS avec identifiants — surface d'attaque plus large sans contrepartie.
- **Décision** : *(ii)*, avec front et fonction **déployés sur la même origine** via Cloudflare Pages Functions. Le cookie reste en `SameSite=Lax`, aucune configuration CORS n'est nécessaire.
- **Conséquences acceptées** : la révocation d'une session ne peut pas être forcée depuis le serveur, puisqu'il n'y a pas d'état. La déconnexion efface le cookie côté client et les données locales ; une session volée resterait valable jusqu'à sa péremption. Compte tenu du périmètre — un utilisateur unique, un accès en lecture seule à ses propres activités sportives — le compromis est retenu.

### D2 — Les données d'activité ne transitent jamais par la fonction

- **Contexte** : ENF2 interdit le transit par un tiers autre que Strava ; l'article III interdit les coûts.
- **Options envisagées** : proxifier l'API Strava derrière la fonction (masque l'`access_token` du JavaScript, mais fait transiter tout l'historique par Cloudflare et consomme le quota de requêtes) ; ou appeler Strava directement depuis le navigateur.
- **Décision** : appel direct. La fonction n'est sollicitée qu'à la connexion et au renouvellement.
- **Conséquences acceptées** : l'`access_token` est visible du JavaScript de la page. Sa durée de vie est de six heures, il n'est jamais persisté, et sa compromission n'expose que la lecture d'activités — pas le renouvellement, qui exige le cookie inaccessible. L'article II est respecté : c'est le `refresh_token` qu'il protège, pas l'`access_token`.

### D3 — Graphique construit à la main en SVG

- **Contexte** : un seul type de graphique est nécessaire (CA5.1 : volume par semaine ou par mois). CA5.4, CA5.5 et CA5.6 posent des exigences précises, et ENF6/ENF7 imposent l'accessibilité clavier et le non-recours à la seule couleur.
- **Options envisagées** : Recharts (~100 ko, dépend de d3, l'accessibilité clavier des points demande du travail supplémentaire) ; Chart.js (rendu en canvas, donc inaccessible aux lecteurs d'écran sans doublure DOM) ; SVG écrit à la main.
- **Décision** : SVG à la main, environ 150 lignes, dans `VolumeChart.tsx` avec les calculs d'échelle isolés dans `src/domain/scale.ts` — donc testables (article VI).
- **Conséquences acceptées** : coût initial supérieur à l'import d'une librairie, et tout second type de graphique demandera de réévaluer cette décision. En contrepartie : le contrôle total sur CA5.4 (creux réels et non points interpolés), CA5.5 (axes non tronqués) et la navigation clavier, pour un poids nul.

### D4 — IndexedDB plutôt que localStorage

- **Contexte** : CA6.1 impose la persistance, CA3.6 parle de 5 000 activités, ENF4 fixe un seuil de 2 secondes.
- **Décision** : IndexedDB. `localStorage` plafonne autour de 5 Mo et son API synchrone bloquerait le fil principal à chaque lecture — incompatible avec ENF4.
- **Conséquences acceptées** : code de persistance asynchrone, donc plus verbeux. La migration de schéma devra être gérée explicitement si le modèle évolue.

### D5 — Fond cartographique : activable, désactivé par défaut

- **Contexte** : CA4.1 demande un tracé « sur un fond cartographique ». Tout fournisseur de tuiles apprend, par les tuiles demandées, la zone géographique des sorties consultées. ENF2 interdit que les données d'activité transitent par un tiers autre que Strava. Les coordonnées ne sont techniquement pas transmises, mais la zone est déduite — l'esprit de ENF2 n'est pas tenu.
- **Options envisagées** :
  - *(a)* Leaflet + tuiles OpenStreetMap par défaut. Conforme à CA4.1, en écart avec ENF2. Les conditions d'usage des tuiles OSM tolèrent un usage personnel.
  - *(b)* Tracé en SVG seul, sans fond de carte, à l'échelle et orienté. Conforme à ENF2, en écart avec CA4.1. Un tracé nu reste lisible pour reconnaître un parcours familier.
  - *(c)* Fond de carte activable, désactivé par défaut, avec mention explicite au premier usage.
- **Décision** : *(c)*, arbitrée par l'utilisateur le 2026-07-29. Le tracé s'affiche par défaut en SVG nu (`src/domain/polyline.ts` projette les coordonnées sur une vue à l'échelle, orientée nord en haut). Un bouton explicite « Afficher le fond de carte » active Leaflet + tuiles OpenStreetMap à la demande, avec une mention affichée tant que le fond n'est pas activé : « Le fond de carte interroge OpenStreetMap, qui recevra la zone géographique de cette sortie. »
- **Conséquences acceptées** : CA4.1 et ENF2 sont tous deux tenus dans l'état par défaut. L'activation du fond de carte est un choix explicite et informé de l'utilisateur, pas un comportement silencieux — c'est ce qui rend l'écart avec ENF2 acceptable dans ce cas précis. Dépendance ajoutée : `leaflet` (~42 Ko, chargée dynamiquement, uniquement si le fond est activé) + `@types/leaflet` en développement.

### D6 — Discipline de quota

- **Contexte** : article IV et cas « quota atteint ». Les plafonds sont de 200 requêtes par tranche de 15 minutes et 2 000 par jour.
- **Décision** : trois mécanismes cumulés.
  1. **Curseur incrémental** — le paramètre `after` vaut `lastActivityStart`, de sorte qu'une synchronisation courante coûte une seule requête (CA6.2).
  2. **Compteur local en fenêtre glissante** — les horodatages des requêtes des 15 dernières minutes sont conservés ; le client s'arrête à 180, gardant 20 requêtes de marge pour la navigation.
  3. **Lecture des en-têtes de quota** — `X-RateLimit-Usage` fait autorité sur le compteur local en cas de divergence.
- **Conséquences acceptées** : une première synchronisation de 5 000 activités représente 25 requêtes — le plafond de 15 minutes n'est jamais atteint dans ce scénario. C'est le rechargement complet répété qui est dangereux, et c'est précisément ce que le curseur supprime.

### D7 — Pas de librairie de gestion d'état

- **Contexte** : article VIII. L'état applicatif se réduit à : session, jeu d'activités, filtres actifs, statut de synchronisation.
- **Décision** : un `Context` React par domaine d'état, alimenté par des hooks maison (`useSession`, `useActivities`, `useFilters`). Les activités sont chargées une fois en mémoire ; le filtrage est un parcours O(n) sur un tableau — environ 3 ms pour 5 000 éléments, très en deçà des 300 ms de ENF5.
- **Conséquences acceptées** : si l'état se ramifie sensiblement dans une fonctionnalité ultérieure, cette décision devra être réexaminée. Elle n'est pas structurante au point d'être coûteuse à défaire.

### D8 — Système visuel dérivé de la maquette, sans framework CSS

- **Contexte** : `design/maquette-tableau-de-bord.html` fait autorité sur le registre visuel (décision Q11). Le thème est unique (Q10). ENF6 interdit l'information portée par la seule couleur, ENF8 impose le niveau AA.
- **Options envisagées** :
  - *(i)* Tailwind. Impose un outillage et une configuration pour reproduire une palette de douze jetons dans un thème unique — le rapport est défavorable.
  - *(ii)* Une bibliothèque de composants (MUI, Mantine). Il faudrait la contraindre à ressembler à la maquette, ce qui coûte plus cher que d'écrire les composants.
  - *(iii)* Propriétés CSS personnalisées + modules CSS.
- **Décision** : *(iii)*. Les jetons relevés sur la maquette sont figés dans `src/ui/theme.css` et constituent la seule source de vérité chromatique.

| Jeton | Valeur | Usage |
|-------|--------|-------|
| `--bg-page` | `#161826` | Fond de page |
| `--bg-card` | `#232532` | Cartes |
| `--bg-track` | `#3F424D` | Fonds de jauge, barres inactives |
| `--text` | `#E9E9ED` | Texte principal |
| `--text-muted` | `rgb(233 233 237 / .7)` | Texte secondaire |
| `--accent` | `#9184D9` | Libellés capitales, accent d'interface |
| `--sport-run` | `#9184D9` | Course à pied |
| `--sport-ride` | `oklch(.66 .125 210)` | Vélo |
| `--sport-hike` | `#7DBF9B` | Randonnée |
| `--sport-other` | `#E0A86F` | Autre |
| `--radius-card` | `8px` | Cartes |
| `--radius-ctl` | `6px` | Contrôles, pastilles, segments |

  Typographie : Inter, repli `system-ui`. Trois tailles seulement — 30 à 34 px en graisse 500 pour les valeurs, 13 à 15 px en 400 pour le corps, 10 à 11 px en 400 avec 1 px d'interlettrage et capitales pour les libellés. Espacement des cartes : `24px 28px`.

- **ENF6, application concrète** : dans les barres ventilées par sport (CA5.7), chaque segment porte un motif SVG distinct en plus de sa teinte — plein pour la course, hachures diagonales pour le vélo, hachures croisées pour la randonnée, pointillés pour « Autre ». La légende reprend teinte et motif. Le survol ou le focus détaille la valeur par sport.
- **ENF8, vérifié sur les jetons** : `--text-muted` sur `--bg-card` donne environ 6,9:1 ; `--accent` sur `--bg-card` environ 5,3:1. Les deux dépassent le seuil AA de 4,5:1. Les jetons de sport ne servent jamais de couleur de texte sur fond de carte sans être doublés d'un libellé.
- **Conséquences acceptées** : Inter doit être embarquée en fichier local — aucun CDN de polices, faute de quoi le rendu diverge de la maquette. Chaque composant écrit ses propres styles, ce qui suppose une discipline de nommage sans le garde-fou d'un framework.

---

## 7. Stratégie de test

**Couverts par Vitest, sans exception** (article VI) :

| Module | Ce qui est vérifié |
|--------|--------------------|
| `domain/activity.ts` | Normalisation ; distance nulle → `null` et non `0` ; sport inconnu → `other` avec `sportRaw` préservé ; activité manuelle sans indicateurs |
| `domain/aggregate.ts` | Totaux ; comparaison à la période précédente ; répartition par sport ; période vide distincte d'une période à zéro |
| `domain/filter.ts` | Combinaisons de filtres ; bornes de dates incluses ; tri stable dans les deux sens ; jeu résultant vide |
| `domain/timeline.ts` | Découpage en semaines ISO ; changements d'heure ; **semaine sans activité présente avec une valeur nulle et non absente** (CA5.4) |
| `domain/polyline.ts` | Décodage sur tracés connus ; chaîne vide ; chaîne malformée |
| `domain/units.ts` | Allure min/km pour les sports à pied, km/h pour les roulants (CA4.5) ; arrondis ; grandeur manquante |
| `domain/scale.ts` | Échelles d'axes ; **absence de troncature d'origine** (CA5.5) |
| `data/quota.ts` | Fenêtre glissante ; arrêt au seuil ; priorité des en-têtes Strava |
| `functions/auth` | Chiffrement/déchiffrement du cookie ; rejet d'un `state` invalide ; 401 sur cookie absent ou corrompu |

**Vérifié manuellement, sans couverture automatisée** : rendu des composants,
parcours de connexion complet contre l'API Strava réelle, ENF9 (compatibilité
navigateurs), ENF8 (contrastes, via un audit outillé).

**Non couvert, et assumé** : aucun test de bout en bout automatisé. Le parcours
OAuth exige un compte réel et des identifiants, ce qui n'est pas automatisable
sans introduire une infrastructure que l'article III proscrit.

**Seuils mesurés plutôt que supposés** : ENF4 et ENF5 font l'objet d'une mesure
sur un jeu de 5 000 activités synthétiques, dans un test dédié qui échoue si le
seuil est franchi.

---

## 8. Risques

| Risque | Probabilité | Impact | Parade |
|--------|-------------|--------|--------|
| L'arbitrage D5 n'est pas rendu avant le découpage de S4 | Moyenne | Faible | S4 est de priorité Moyenne ; le lot correspondant est planifié en dernier. |
| Le graphique SVG maison coûte plus cher que prévu | Moyenne | Moyen | Périmètre volontairement étroit : un seul type de graphique. Si le coût dérape, le repli sur une librairie est une décision locale à `VolumeChart.tsx`, sans effet sur le domaine. |
| Première synchronisation perçue comme lente sur un gros historique | Élevée | Faible | CA6.5 l'impose déjà : progression affichée et données consultables au fur et à mesure. Conséquence assumée de la décision Q2. |
| Le quota d'application Strava (et non d'utilisateur) devient limitant | Faible | Élevé | Périmètre mono-utilisateur (section 2 de la spec). Non pertinent tant que l'application n'est pas partagée. |
| Volume IndexedDB sur un très gros historique | Faible | Faible | Environ 400 octets par activité normalisée, soit 2 Mo pour 5 000 activités. Aucun quota navigateur n'est approché. |
| Évolution de l'API Strava (champs, types de sport) | Moyenne | Faible | La validation par schéma échoue explicitement plutôt que de propager des données corrompues ; l'ensemble `SportKind` est ouvert par sa branche `other`. |
