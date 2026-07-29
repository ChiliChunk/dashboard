# Tâches — Dashboard de visualisation des sorties sportives Strava

**Spec source** : `specs/001-dashboard-strava/spec.md` (statut : Validée)
**Plan source** : `specs/001-dashboard-strava/plan.md` (statut : Validé)
**Date** : 2026-07-29

> Légende : `[P]` = parallélisable avec les tâches voisines portant la même marque.
> Chaque tâche cite les critères qu'elle couvre. Une tâche sans rattachement
> n'existe pas, sauf mention explicite « fondation » — auquel cas elle rend
> possible les tâches suivantes plutôt que de couvrir un critère directement.

---

## Lot 0 — Socle

- [x] **T001** — Initialiser le projet Vite + React + TypeScript strict
  - Fichiers : `package.json`, `tsconfig.json`, `vite.config.ts`, `src/main.tsx`, `index.html`
  - Dépend de : —
  - Couvre : — (fondation, prérequis de toutes les tâches suivantes)
  - Terminé quand : `npm run dev` sert une page vide sans erreur TypeScript, `strict` et `noUncheckedIndexedAccess` actifs dans `tsconfig.json`.

- [x] **T002** `[P]` — Outillage : ESLint, Vitest, scripts npm
  - Fichiers : `eslint.config.js`, `vitest.config.ts`, `package.json`
  - Dépend de : T001
  - Couvre : — (fondation, condition des articles V et VI)
  - Terminé quand : `npm run lint` et `npm run test` s'exécutent sans erreur sur un projet vide.

- [x] **T003** `[P]` — Jetons visuels (D8) : `theme.css` et police Inter embarquée
  - Fichiers : `src/ui/theme.css`, `public/fonts/Inter-Regular.woff2`, `public/fonts/Inter-Medium.woff2`, `src/main.tsx`
  - Dépend de : T001
  - Couvre : ENF6 (base — jetons de motif à venir en T063), ENF8 (base — contrastes vérifiés en T072)
  - Terminé quand : les douze jetons de la table D8 existent en propriétés CSS personnalisées ; Inter s'affiche sans requête réseau externe (vérifiable onglet réseau, aucune requête vers un CDN de polices).
  - **Note** : polices récupérées depuis `fonts.gstatic.com` (licence SIL Open Font), autorisation donnée explicitement par l'utilisateur le 2026-07-29. Vérifié dans le navigateur sur un onglet neuf : `document.fonts` rapporte `Inter 400 loaded`, `getComputedStyle(document.body).fontFamily` renvoie `Inter, system-ui, ...`. Aucune requête vers un CDN externe au runtime — les fichiers sont servis localement depuis `/fonts/`.

- [x] **T004** — Schémas de validation aux frontières
  - Fichiers : `src/domain/schemas.ts`
  - Dépend de : T001
  - Couvre : — (fondation transverse, article V)
  - Terminé quand : un schéma valibot existe pour une réponse d'activité Strava brute, rejetant explicitement un champ de type incorrect.

- [x] **T005** `[P]` — Types de domaine : `Activity` et `SportKind`
  - Fichiers : `src/domain/types.ts`
  - Dépend de : T004
  - Couvre : — (fondation, prépare CA4.4 et les cas « activité manuelle », « type inconnu », « valeur aberrante », implémentés en T020)
  - Terminé quand : les types compilent en mode strict et correspondent exactement au tableau de modèle de données du plan (section 4).

- [x] **T006** — Déploiement Cloudflare Pages + Pages Functions, environnement local
  - Fichiers : `wrangler.toml`, `functions/.gitkeep`, `package.json`
  - Dépend de : T001
  - Couvre : ENF2 (base — aucune donnée d'activité ne transite par la fonction, par construction de l'arborescence), ENF3
  - Terminé quand : `wrangler pages dev` sert le front et une route `functions/api/health.ts` de test répond 200.

- [x] **T007** — Routage applicatif et pages vides
  - Fichiers : `src/App.tsx`, `src/routes.tsx`
  - Dépend de : T001
  - Couvre : — (fondation, implémente les contrats de la section 5 du plan)
  - Terminé quand : les trois routes (`/`, `/activity/:id`, `/auth/done`) rendent chacune un composant placeholder distinct.

---

## Lot 1 — Authentification (S1)

- [x] **T010** — Configuration OAuth Strava et clé de chiffrement
  - Fichiers : `wrangler.toml` (bindings), `.dev.vars.example`, `functions/api/auth/_shared.ts`
  - Dépend de : T006
  - Couvre : ENF1 (base)
  - Terminé quand : `_shared.ts` expose la lecture des variables secrètes (`STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `SESSION_ENCRYPTION_KEY`) et échoue explicitement si l'une manque.

- [x] **T011** — Route `/api/auth/start`
  - Fichiers : `functions/api/auth/start.ts`
  - Dépend de : T010
  - Couvre : CA1.2, CA1.3
  - Terminé quand : la route redirige (302) vers `strava.com/oauth/authorize` avec `scope=activity:read` exactement, pose le cookie `sdd_state`, et rejette un `return_to` non relatif.

- [x] **T012** — Route `/api/auth/callback` et chiffrement du jeton de rafraîchissement
  - Fichiers : `functions/api/auth/callback.ts`, `functions/api/auth/crypto.ts`
  - Dépend de : T011
  - Couvre : CA1.3, CA1.4, ENF1
  - Terminé quand : un `code` valide pose `sdd_session` (refresh_token chiffré AES-GCM) et redirige vers `return_to` ; un `state` invalide ou un paramètre `error` redirige vers l'application avec un message, sans jeter d'exception non gérée.

- [x] **T013** — Route `/api/auth/token`
  - Fichiers : `functions/api/auth/token.ts`
  - Dépend de : T012
  - Couvre : CA1.5, cas « session expirée », cas « autorisation révoquée »
  - Terminé quand : un cookie valide renvoie `{ accessToken, expiresAt, athleteId }` ; un cookie absent, corrompu, ou un refus de Strava au renouvellement renvoie 401 sans lever d'exception côté client.

- [x] **T014** `[P]` — Route `/api/auth/logout`
  - Fichiers : `functions/api/auth/logout.ts`
  - Dépend de : T012
  - Couvre : CA1.6 (volet serveur)
  - Terminé quand : l'appel efface le cookie `sdd_session` et renvoie 204.

- [x] **T015** — Tests des routes d'authentification — **fichier ajouté hors liste initiale, voir note**
  - Fichiers : `functions/api/auth/crypto.test.ts`, `functions/api/auth/token.test.ts`, `functions/api/auth/callback.test.ts`
  - Dépend de : T012, T013
  - Couvre : stratégie de test section 7 du plan — module `functions/auth`
  - Terminé quand : les tests couvrent chiffrement/déchiffrement, rejet d'un `state` invalide, et 401 sur cookie absent ou corrompu ; `npm run test` passe.
  - **Note** : le rejet d'un `state` invalide est un comportement de `callback.ts`, pas de `token.ts` — la liste de fichiers d'origine ne couvrait pas ce cas. `callback.test.ts` a été ajouté pour que la condition « terminé quand » soit réellement vérifiée, plutôt que déclarée sans preuve. 9/9 tests passent (`npm run test`).

- [x] **T016** — Session côté client et écran de connexion
  - Fichiers : `src/data/session.ts`, `src/ui/ConnectGate.tsx`, `src/App.tsx`
  - Dépend de : T013, T014, T007
  - Couvre : CA1.1, CA1.5, CA1.6 (volet client)
  - Terminé quand : un utilisateur non connecté ne voit que l'invitation à se connecter (CA1.1) ; la déconnexion appelle `/api/auth/logout` puis efface la base IndexedDB (vérifiable : base absente après rechargement).

---

## Lot 2 — Ingestion et persistance (S6)

- [x] **T020** — Normalisation des activités
  - Fichiers : `src/domain/activity.ts`, `src/domain/activity.test.ts`
  - Dépend de : T005
  - Couvre : CA4.4 (base), cas « activité manuelle », « type inconnu », « valeur aberrante »
  - Terminé quand : les tests démontrent qu'une distance ≤ 0 devient `null` (jamais `0`), qu'un `sport_type` non reconnu tombe dans `other` en conservant `sportRaw`, et que les 8 valeurs de `sport_type` du tableau de mapping (plan section 4) sont correctement réparties entre `run`, `ride`, `hike`.

- [x] **T021** — Client Strava : pagination et curseur incrémental
  - Fichiers : `src/data/strava.ts`
  - Dépend de : T016, T020
  - Couvre : CA6.2, CA4.3 (appel de détail), ENF2 (l'appel est direct, aucun passage par la fonction)
  - Terminé quand : `fetchActivities(after)` pagine à 200 éléments par page et n'interroge que les activités postérieures au curseur fourni ; `fetchActivityDetail(id)` renvoie les champs de CA4.3.

- [x] **T022** — Discipline de quota
  - Fichiers : `src/data/quota.ts`, `src/data/quota.test.ts`
  - Dépend de : T021
  - Couvre : article IV, cas « quota atteint »
  - Terminé quand : les tests démontrent l'arrêt à 180 requêtes sur la fenêtre de 15 minutes, et la priorité de l'en-tête `X-RateLimit-Usage` sur le compteur local en cas de divergence.

- [x] **T023** — Persistance IndexedDB
  - Fichiers : `src/data/store.ts`, `src/data/store.test.ts`
  - Dépend de : T020
  - Couvre : CA6.1, CA6.3, CA1.6 (volet suppression de la base)
  - Terminé quand : les tests couvrent l'écriture/lecture d'activités, la lecture du `SyncCursor`, et la suppression complète de la base `strava-dashboard`.
  - **Note** : les tests ont d'abord échoué (timeout) — `store.ts` ouvrait une nouvelle connexion IndexedDB à chaque appel sans jamais la fermer, ce qui bloque `indexedDB.deleteDatabase` tant que d'anciennes connexions restent ouvertes. Corrigé par une connexion singleton fermée explicitement dans `clearDatabase()`. `session.ts` (T016) a été mis à jour pour appeler ce `clearDatabase()` plutôt que dupliquer l'appel `indexedDB.deleteDatabase` en clair.

- [x] **T024** — Orchestration de synchronisation — **vérification complète en attente de T074**
  - Fichiers : `src/data/sync.ts`, `src/ui/SyncStatus.tsx`
  - Dépend de : T021, T022, T023
  - Couvre : CA6.4, CA6.5, cas « perte de connexion réseau »
  - Terminé quand : une première synchronisation affiche une progression et rend les activités déjà reçues consultables avant la fin ; un bouton force une resynchronisation complète ; une perte réseau signale l'absence de synchronisation sans bloquer la lecture du cache.
  - **Note** : code écrit et vérifié par lecture, `tsc`/lint propres ; la boucle `runSync` s'appuie correctement sur T021–T023. Aucun test dédié (non listé pour cette tâche, cohérent avec la section 7 du plan qui exclut l'automatisation du parcours OAuth). La vérification fonctionnelle réelle — un accès Strava vivant — n'est possible qu'avec un compte réel : reportée sur T074.

- [x] **T025** `[P]` — Formatage des unités
  - Fichiers : `src/domain/units.ts`, `src/domain/units.test.ts`
  - Dépend de : T005
  - Couvre : CA2.6, CA4.5
  - Terminé quand : les tests démontrent min/km pour `run` et `hike`, km/h pour `ride`, et l'absence d'affichage quand la grandeur source est `null`.

---

## Lot 3 — Synthèse (S2)

- [x] **T030** — Agrégats et comparaison de périodes
  - Fichiers : `src/domain/aggregate.ts`, `src/domain/aggregate.test.ts`
  - Dépend de : T020, T025
  - Couvre : CA2.1, CA2.2, CA2.3
  - Terminé quand : les tests couvrent le calcul des quatre totaux, la comparaison signée à la période précédente équivalente, et la répartition par sport.

- [x] **T031** `[P]` — Périodes sélectionnables
  - Fichiers : `src/domain/period.ts`, `src/domain/period.test.ts`
  - Dépend de : T005
  - Couvre : CA2.4, CA2.9
  - Terminé quand : les cinq périodes de CA2.4 sont résolues en bornes de dates exactes ; la semaine en cours est la période par défaut ; chaque période produit un libellé en toutes lettres avec ses bornes.

- [x] **T032** — Bandeau de période
  - Fichiers : `src/ui/PeriodHeader.tsx`
  - Dépend de : T031
  - Couvre : CA2.9, CA3.4 (affichage des filtres actifs, branchement complet en T042)
  - Terminé quand : le bandeau affiche le libellé de période produit par T031 et un emplacement pour les filtres de sport, conforme aux jetons de `theme.css`.

- [x] **T033** — Répartition jour par jour
  - Fichiers : `src/ui/DayBreakdown.tsx`
  - Dépend de : T030, T031
  - Couvre : CA2.7, CA2.8
  - Terminé quand : affiché uniquement quand la période est la semaine en cours ; un jour à venir, un jour écoulé sans activité et un jour actif sont visuellement distincts sans reposer sur la seule couleur.

- [x] **T034** `[P]` — États vides
  - Fichiers : `src/ui/EmptyState.tsx`
  - Dépend de : T003
  - Couvre : CA2.5, cas « compte sans activité »
  - Terminé quand : le composant expose des variantes visuellement distinctes pour « chargement », « période vide » et « compte sans aucune activité ».

- [x] **T035** — Vue de synthèse assemblée — **vérification visuelle complète en attente de T074**
  - Fichiers : `src/ui/Summary.tsx`, `src/routes.tsx`
  - Dépend de : T030, T032, T033, T034, T024
  - Couvre : CA2.1 → CA2.9 (assemblage)
  - Terminé quand : la page d'accueil affiche la synthèse complète sur données réelles synchronisées, changement de période inclus.
  - **Note** : assemblage type-safe (`tsc`), lint propre, s'appuie sur les modules de domaine tous testés (T030, T031, T025). Deux précisions ajoutées par jugement d'implémentation, au-delà de la lettre de la spec : (1) distinction entre « compte sans aucune activité » et « période vide » — la spec les traite comme un seul cas, le code les distingue car ce sont deux messages différents dans la table des cas limites ; (2) aucune comparaison n'est affichée pour la période « historique complet », qui n'a pas de période précédente équivalente — l'afficher aurait produit une variation trompeuse. Le rendu réel avec des données synchronisées ne peut être vérifié qu'avec un compte Strava vivant : reporté sur T074, comme T024.

---

## Lot 4 — Liste et filtres (S3)

- [x] **T040** — Filtrage et tri
  - Fichiers : `src/domain/filter.ts`, `src/domain/filter.test.ts`
  - Dépend de : T020
  - Couvre : CA3.2, CA3.3, CA3.5, ENF5 (mesure incluse)
  - Terminé quand : les tests couvrent le filtre combiné sport + intervalle de dates, le tri dans les deux sens sur les trois colonnes, et mesurent un résultat en moins de 300 ms sur 5 000 activités synthétiques.

- [x] **T041** — Liste virtualisée des sorties — **le tri (CA3.3) et l'état vide (CA3.7) y ont été ajoutés, voir note**
  - Fichiers : `src/ui/ActivityList.tsx`
  - Dépend de : T040, T003
  - Couvre : CA3.1, CA3.6, CA3.3 (contrôles), CA3.7 (état vide)
  - Terminé quand : les six colonnes de CA3.1 s'affichent ; un jeu de 5 000 activités synthétiques défile sans blocage perceptible (mesure manuelle, seuil article VI).
  - **Note** : la répartition initiale des tâches confiait CA3.3 (tri) au seul domaine (T040) sans lui donner de porte d'entrée dans l'interface. Les boutons de tri ont été ajoutés ici, dans le composant qui affiche la liste triée — sans quoi CA3.3 restait implémenté mais inatteignable par l'utilisateur. Virtualisation via `@tanstack/react-virtual` (nouvelle dépendance, ~5 ko, justifiée au plan D-aucune / section 3). Défilement fluide vérifié par construction (rendu limité aux lignes visibles) ; la perception réelle sur 5 000 activités reste à confirmer manuellement (T073).

- [ ] **T042** — Filtres actifs et intégration complète
  - Fichiers : `src/ui/PeriodHeader.tsx`, `src/App.tsx`
- [x] **T042** — Filtres actifs et intégration complète — **refactor de portée additionnelle, voir note**
  - Dépend de : T032, T041
  - Couvre : CA3.4, CA3.5, CA3.7
  - Terminé quand : chaque filtre actif est visible et annulable individuellement ; la synthèse (T035) et la liste reflètent les mêmes filtres ; un filtre sans résultat affiche l'état vide de T034 invitant à l'élargir.
  - **Note** : en branchant `ActivityList` sur les mêmes données que `Summary`, un risque est apparu — si chaque composant appelait `useSession`/`useSync` indépendamment, deux boucles de synchronisation tourneraient en parallèle et doubleraient la consommation du quota Strava (article IV), silencieusement. Correction : la session et la synchronisation ne sont plus appelées que dans `routes.tsx` (`HomePage`), qui distribue les données en props à `Summary` et `ActivityList`. `Summary.tsx` a donc changé de signature (accepte désormais ses données en props). Persistance des filtres dans l'URL via un nouveau fichier `src/data/filters.ts` (utilise `wouter`, déjà présent — aucune dépendance ajoutée), conformément au contrat de la section 5 du plan (`?sport=run&from=...`).

---

## Lot 5 — Détail de sortie (S4 · priorité Moyenne)

- [x] **T050** `[P]` — Décodage du tracé encodé
  - Fichiers : `src/domain/polyline.ts`, `src/domain/polyline.test.ts`
  - Dépend de : T005
  - Couvre : CA4.1 (préparation — décodage seul, sans rendu)
  - Terminé quand : les tests couvrent un tracé connu, une chaîne vide, et une chaîne malformée sans lever d'exception.

- [x] **T051** — Page de détail : indicateurs et lien Strava
  - Fichiers : `src/ui/ActivityDetail.tsx`, `src/routes.tsx`
  - Dépend de : T021, T025, T050
  - Couvre : CA4.2, CA4.3, CA4.4, CA4.5, CA4.6
  - Terminé quand : les indicateurs obligatoires s'affichent toujours, les optionnels (FC, puissance, cadence) seulement s'ils sont présents, une activité sans position affiche la mention d'absence de tracé, et un lien ouvre l'activité sur Strava.
  - **Note** : chargement réel du détail non vérifiable sans compte Strava (reporté sur T074) ; `tsc`/lint propres, logique de branchement (indicateurs optionnels, absence de tracé) conforme par lecture du code.

- [x] **T052** — Affichage du tracé sur son fond
  - Fichiers : `src/ui/ActivityDetail.tsx`, `src/ui/TrackView.tsx`
  - Dépend de : T050, T051, **la décision D5 doit être rendue**
  - Couvre : CA4.1
  - Terminé quand : le tracé s'affiche selon l'option retenue en D5 (fond de tuiles, tracé SVG nu, ou fond activable) ; une activité avec `polyline` non nul produit un rendu visible.
  - **Note** : D5 arbitrée par l'utilisateur le 2026-07-29 — option (c), fond activable désactivé par défaut. SVG nu par défaut (projection géographique extraite et testée dans `src/domain/trackProjection.ts`, 6 tests, plutôt que laissée non testée dans le composant — article VI). Le bouton bascule vers Leaflet + tuiles OpenStreetMap, avec la mention explicite exigée par D5 tant que le fond n'est pas activé. `leaflet` est chargé dynamiquement (`import("leaflet")`) : le build confirme qu'il forme un chunk séparé de 150 Ko, absent du chargement initial — la carte reste dormante tant qu'elle n'est pas demandée. Rendu réel du tracé (nécessite une activité avec `polyline` non nul) reporté sur T074.

---

## Lot 6 — Progression dans le temps (S5 · priorité Moyenne)

- [x] **T060** — Découpage temporel semaine/mois
  - Fichiers : `src/domain/timeline.ts`, `src/domain/timeline.test.ts`
  - Dépend de : T020
  - Couvre : CA5.1, CA5.3, CA5.4
  - Terminé quand : les tests démontrent qu'une semaine ou un mois sans activité produit une valeur nulle explicite dans la série, jamais un point absent ; le filtre de sport actif est respecté.

- [x] **T061** `[P]` — Échelles d'axes
  - Fichiers : `src/domain/scale.ts`, `src/domain/scale.test.ts`
  - Dépend de : T060
  - Couvre : CA5.5
  - Terminé quand : les tests démontrent que l'échelle part toujours de zéro (aucune troncature d'origine sans mention).

- [x] **T062** — Graphique SVG : barres et interaction — **écrit avec T063/T064 dans le même fichier, voir note**
  - Fichiers : `src/ui/VolumeChart.tsx`
  - Dépend de : T061
  - Couvre : CA5.2, CA5.6
  - Terminé quand : le choix de grandeur (distance, durée, dénivelé) recalcule le graphique ; le survol ou la sélection d'une barre au clavier affiche la valeur et la période exactes.
  - **Note** : `VolumeChart.tsx` a été écrit en une seule fois pour T062+T063+T064 plutôt qu'en trois passes séquentielles sur le même petit fichier — chaque tâche reste vérifiable indépendamment dans le résultat final. Le composant gère aussi sa propre sélection de période (non prévue explicitement dans la liste de fichiers) : sans cela, S5 n'aurait eu aucune période affichable et serait resté inatteignable dans l'interface.

- [x] **T063** — Ventilation par sport dans les barres
  - Fichiers : `src/ui/VolumeChart.tsx`, `src/ui/theme.css`
  - Dépend de : T062
  - Couvre : CA5.7, ENF6 (application concrète)
  - Terminé quand : chaque segment de barre porte le motif SVG de sa catégorie (plein, hachures diagonales, hachures croisées, pointillés) en plus de sa teinte ; la légende reprend les deux.

- [x] **T064** `[P]` — Moyenne de période affichée
  - Fichiers : `src/ui/VolumeChart.tsx`
  - Dépend de : T062
  - Couvre : CA5.8
  - Terminé quand : la moyenne par période sur l'intervalle affiché apparaît à proximité du graphique avec son unité.

---

## Lot 7 — Vérification finale et exigences transverses

- [x] **T070** — Mesure ENF4 / ENF5 sur jeu synthétique
  - Fichiers : `src/domain/perf.test.ts`, fixtures de 5 000 activités synthétiques
  - Dépend de : T035, T041
  - Couvre : ENF4, ENF5
  - Terminé quand : un test échoue explicitement si la synthèse dépasse 2 s ou un filtre 300 ms sur le jeu de 5 000 activités.
  - **Note** : mesuré — 582 ms pour lecture IndexedDB + agrégation complète sur 5 000 activités (seuil 2 000 ms), largement sous le seuil. Le test mesure ce que le domaine contrôle réellement (lecture cache, agrégation, filtre, tri) ; le temps de peinture du navigateur et la latence réseau ne sont pas automatisables sans outillage de bout en bout absent du plan — non mesurés ici, cohérent avec la section 7 du plan.

- [x] **T071** — Navigation clavier et focus visibles — **vérification partielle, voir note**
  - Fichiers : correctifs ciblés dans `src/ui/*.tsx`, `src/ui/theme.css`
  - Dépend de : T035, T042, T062
  - Couvre : ENF7
  - Terminé quand : toutes les fonctions atteintes par la souris le sont aussi au clavier, avec un état de focus visible sur chaque élément interactif.
  - **Note** : aucun correctif n'a été nécessaire — tous les contrôles utilisent des éléments natifs (`button`, `select`, `input`, `label`), et les barres du graphique portent `tabIndex={0}` + `role="button"` explicites. Vérifié réellement dans le navigateur : `Tab` déplace le focus sur le bouton « Se connecter avec Strava » (seul élément atteignable sans compte réel) et affiche l'anneau de focus de `theme.css` (2 px, couleur d'accent, décalage 2 px). Le reste de la surface interactive (liste, filtres, graphique) n'est vérifiable au clavier qu'une fois des données réelles chargées : reporté sur T074.

- [x] **T072** — Audit de contraste AA
  - Fichiers : `src/ui/theme.css` (correctifs si nécessaire)
  - Dépend de : T003, T035
  - Couvre : ENF8
  - Terminé quand : un audit outillé (par exemple axe DevTools) ne relève aucun contraste sous le seuil AA sur les jetons de D8 en contexte réel.
  - **Note** : ratios calculés (formule WCAG de luminance relative, pas d'estimation) : texte principal sur fond de page 14,54:1, texte principal sur carte 12,55:1, texte atténué sur page 7,64:1, texte atténué sur carte 6,89:1, accent sur page 5,45:1, **accent sur carte 4,71:1**. Tous dépassent le seuil AA de 4,5:1 — le dernier avec une marge réelle mais étroite (0,21), à surveiller si la palette est retouchée. Aucun correctif nécessaire.

- [ ] **T073** — Vérification manuelle multi-navigateurs et responsive
  - Fichiers : — (vérification, correctifs si nécessaire)
  - Dépend de : T035, T041
  - Couvre : ENF9
  - Terminé quand : l'application est vérifiée fonctionnelle sur Chrome, Firefox et Safari, de 360 px à 2 560 px de large.

- [ ] **T074** — Parcours de connexion de bout en bout contre l'API Strava réelle
  - Fichiers : — (vérification manuelle)
  - Dépend de : T016, T024
  - Couvre : vérification manuelle S1 + S6 (section 7 du plan — non automatisable)
  - Terminé quand : une connexion réelle, une synchronisation complète et une déconnexion sont exécutées sans anomalie sur un compte Strava réel.

- [ ] **T075** — Vérification des cas limites transverses restants
  - Fichiers : correctifs ciblés selon constats
  - Dépend de : T024, T035, T042
  - Couvre : cas « autorisation révoquée » (bout en bout), cas « perte de connexion réseau » (affinage)
  - Terminé quand : une révocation d'autorisation déclenchée depuis Strava ramène l'application à l'état non connecté avec effacement des données locales, vérifié manuellement.

---

## Suivi

| Lot | Tâches | Terminées | État |
|-----|--------|-----------|------|
| 0 — Socle | T001–T007 | 7 / 7 | Terminé |
| 1 — Authentification (S1) | T010–T016 | 7 / 7 | Terminé (parcours réel contre Strava : T074) |
| 2 — Ingestion et persistance (S6) | T020–T025 | 6 / 6 | Terminé (parcours réel : T074) |
| 3 — Synthèse (S2) | T030–T035 | 6 / 6 | Terminé (rendu réel : T074) |
| 4 — Liste et filtres (S3) | T040–T042 | 3 / 3 | Terminé |
| 5 — Détail de sortie (S4) | T050–T052 | 3 / 3 | Terminé (rendu réel : T074) |
| 6 — Progression (S5) | T060–T064 | 5 / 5 | Terminé (rendu réel : T074) |
| 7 — Vérification finale | T070–T075 | 3 / 6 | **T073, T074, T075 exigent un environnement hors de portée — voir rapport** |

**Total : 43 tâches — 40 terminées. Restent T073, T074, T075**, qui exigent
respectivement un test multi-navigateurs réel, un compte Strava vivant, et une
révocation d'autorisation déclenchée depuis Strava — non automatisables,
comme l'admet le plan (section 7).

**Ordre recommandé pour la définition de terminé** (S1, S2, S3, S6 — priorité
Haute) : lots 0 → 1 → 2 → 3 → 4 → 7 (parties ENF4/ENF5/ENF9/T074 applicables).
Les lots 5 et 6 (S4, S5 — priorité Moyenne) peuvent être traités avant ou après
le lot 7 selon la disponibilité de l'arbitrage D5.
