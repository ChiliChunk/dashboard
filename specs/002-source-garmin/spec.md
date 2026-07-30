# Spécification — Source de données Garmin pour le tableau de bord

**Identifiant** : 002-source-garmin
**Statut** : Validée
**Date** : 2026-07-29 (rédaction) · 2026-07-29 (validation)

> Ce document décrit **ce que** le système doit faire et **pourquoi**.
> Il ne contient aucun choix technique : pas de librairie, pas d'architecture,
> pas de nom de fonction. Ces sujets appartiennent à `plan.md`.

---

## 1. Problème

Le tableau de bord (fonctionnalité 001) dépend entièrement de Strava comme
source de données. L'accès à l'API Strava nécessaire à cette dépendance est
devenu payant, ce qui rend la poursuite de cette voie incompatible avec
l'exigence de coût d'exploitation nul du projet.

L'utilisateur possède par ailleurs un compte et un historique d'activités
Garmin. Sans cette fonctionnalité, il n'a aucun moyen de faire apparaître ces
activités dans le tableau de bord déjà construit : il devrait consulter
séparément l'application ou le site Garmin, en perdant les vues de synthèse,
de comparaison de périodes et de progression déjà disponibles.

## 2. Utilisateurs visés

Le même pratiquant que celui de la fonctionnalité 001 : un utilisateur unique,
propriétaire du tableau de bord, suivant sa propre pratique sportive, à l'aise
avec l'outil puisqu'il en est aussi le développeur. Son compte Garmin devient
la source de vérité de ses activités, à la place de Strava, qui n'est plus
utilisé.

## 3. Périmètre exclu

- La fonctionnalité ne prend en charge qu'un seul compte Garmin ; l'agrégation
  de plusieurs comptes n'est pas traitée.
- Aucune fonctionnalité sociale de Garmin Connect (segments, kudos,
  commentaires, défis, abonnés) n'est reprise.
- Aucune écriture n'est effectuée sur le compte Garmin de l'utilisateur : la
  fonctionnalité est strictement en lecture, à l'image de la limitation déjà
  posée pour Strava.
- Les mesures physiologiques propres aux montres Garmin sans équivalent déjà
  affiché pour Strava (VO2max, charge d'entraînement, sommeil, stress,
  fréquence cardiaque au repos, « body battery ») sont hors périmètre.
- Strava n'est plus utilisé comme source de données : aucune coexistence ni
  bascule entre les deux sources n'est prévue. Un historique Strava déjà
  présent localement est abandonné, sans tentative de fusion avec les
  données Garmin.
- Aucune démarche de connexion n'est proposée dans l'interface du tableau de
  bord : la configuration de l'accès au compte Garmin se fait entièrement en
  dehors de cette interface, une seule fois, par l'utilisateur lui-même.
- Le fonctionnement hors connexion lors de la toute première récupération de
  données n'est pas couvert ; comme pour Strava, seul un cache déjà rempli
  permet un usage hors ligne.

## 4. Scénarios utilisateur

### S1 — Voir ses activités Garmin sans démarche de connexion · Priorité : Haute

**En tant que** pratiquant équipé d'un compte Garmin, **je veux** retrouver mes
sorties dans le tableau de bord sans avoir à m'y connecter, **afin de** suivre
mon activité sans dépendre d'un service devenu payant.

Déroulé nominal :
1. L'utilisateur ouvre le tableau de bord.
2. Le tableau de bord récupère automatiquement les activités les plus
   récentes du compte Garmin déjà configuré, sans action de l'utilisateur.
3. Les activités obtenues apparaissent dans les vues déjà existantes
   (synthèse, répartition par jour, liste, détail, progression).

Critères d'acceptation :
- [ ] CA1.1 — Une activité enregistrée sur le compte Garmin apparaît dans le
      tableau de bord avec au minimum : date, type de sport, distance, durée,
      dénivelé positif.
- [ ] CA1.2 — Aucune donnée n'est créée, modifiée ou supprimée sur le compte
      Garmin de l'utilisateur.
- [ ] CA1.3 — À chaque ouverture du tableau de bord, les activités les plus
      récentes du compte Garmin sont récupérées automatiquement, sans
      qu'aucune action de connexion ne soit demandée à l'utilisateur.
- [ ] CA1.4 — Une consultation ultérieure ne nécessite pas de récupérer à
      nouveau l'historique déjà obtenu : seules les activités nouvelles
      depuis la dernière ouverture sont demandées.

### S2 — Conserver les vues déjà existantes avec des données Garmin · Priorité : Haute

**En tant qu'**utilisateur du tableau de bord, **je veux** que la synthèse, la
répartition par jour, la liste des sorties, le détail d'une sortie et la
progression dans le temps fonctionnent à l'identique avec des activités
Garmin, **afin de** ne rien perdre de l'expérience déjà construite pour
Strava.

Déroulé nominal :
1. L'utilisateur ouvre une vue déjà existante du tableau de bord.
2. Cette vue affiche les mêmes informations que pour une activité Strava,
   désormais calculées à partir des activités Garmin.

Critères d'acceptation :
- [ ] CA2.1 — Chaque vue déjà spécifiée par la fonctionnalité 001 (synthèse de
      période, répartition par jour, liste filtrable et triable, détail d'une
      sortie, progression dans le temps) affiche correctement des activités
      Garmin, sans qu'aucune de ces vues ne soit dégradée ou supprimée.
- [ ] CA2.2 — Chaque activité Garmin est ramenée à l'une des catégories de
      sport déjà utilisées par le tableau de bord (course à pied, vélo,
      randonnée, autre).
- [ ] CA2.3 — Une activité Garmin dépourvue d'une mesure par ailleurs
      optionnelle pour Strava (fréquence cardiaque, puissance, cadence,
      dénivelé, position GPS) est traitée exactement comme le cas déjà
      spécifié pour Strava : absence signalée, jamais une valeur inventée.

## 5. Cas limites et erreurs

| Situation | Comportement attendu |
|-----------|----------------------|
| Le compte Garmin ne contient aucune activité | Le tableau de bord affiche l'état « aucune activité enregistrée » déjà spécifié pour un compte Strava vide, sans confusion avec une période simplement vide. |
| La récupération des données Garmin échoue ou est momentanément indisponible | L'utilisateur voit les dernières données déjà obtenues, avec une indication explicite que la tentative la plus récente n'a pas abouti, sans blocage de l'interface. |
| L'accès configuré au compte Garmin n'est plus valide (identifiants changés, accès révoqué) | Traité comme un échec de récupération : le tableau de bord conserve les dernières données déjà obtenues et signale clairement que la tentative la plus récente a échoué, sans blocage de l'interface ni tentative de reconnexion depuis l'interface. |
| Une activité Garmin ne porte aucune position GPS | Le détail de l'activité mentionne explicitement l'absence de tracé, comme déjà spécifié pour Strava. |
| Une activité Garmin est d'un type non reconnu par le tableau de bord | Elle est rattachée à la catégorie « Autre » déjà existante, jamais ignorée. |
| Un historique Strava est déjà présent localement au moment de l'arrivée des données Garmin | Cet historique est abandonné : le tableau de bord ne conserve et n'affiche que les données Garmin, sans tentative de fusion ni de migration. |

## 6. Exigences non fonctionnelles

- **Coût** : la solution retenue respecte strictement l'exigence de coût
  d'exploitation nul déjà posée pour la fonctionnalité 001 (article III de la
  constitution) ; aucune exception n'est accordée.
- **Confidentialité** : aucun identifiant ni secret d'accès au compte Garmin
  de l'utilisateur ne réside dans du code livré au navigateur ; la
  configuration de cet accès se fait exclusivement en dehors de l'interface
  du tableau de bord.
- **Performance** : la synthèse d'une période reste disponible en moins de
  2 secondes sur un historique de 5 000 activités, comme déjà exigé pour
  Strava.
- **Fiabilité des visualisations** : les exigences déjà posées pour Strava
  (axes non tronqués sans mention, unités toujours affichées, absence de
  donnée distincte d'une valeur nulle, palettes lisibles en déficience de
  perception des couleurs) s'appliquent sans changement aux données Garmin.

## 7. Points à clarifier

| # | Question | Décision | Date |
|---|----------|----------|------|
| 1 | Comment l'utilisateur indique-t-il au tableau de bord que sa source de données est Garmin : une démarche qu'il effectue lui-même en dehors de l'application, ou une autorisation en ligne comparable à celle déjà utilisée pour Strava ? | **Aucune démarche dans l'application.** L'accès au compte Garmin est configuré une seule fois, en dehors de l'interface du tableau de bord, par l'utilisateur lui-même. | 2026-07-29 |
| 2 | Quelle fraîcheur de données est exigée : l'utilisateur doit-il déclencher lui-même chaque mise à jour, ou doit-elle survenir automatiquement à l'ouverture du tableau de bord ou entre deux ouvertures ? | **Automatique à chaque ouverture.** Les activités les plus récentes sont récupérées à chaque ouverture du tableau de bord, sans action de l'utilisateur. | 2026-07-29 |
| 3 | Strava reste-t-il une source possible en parallèle de Garmin, ou cette fonctionnalité le remplace-t-elle définitivement ? | **Remplacement définitif.** Strava n'est plus utilisé ; aucune coexistence n'est prévue. | 2026-07-29 |
| 4 | Les catégories de sport Garmin doivent-elles être ramenées aux catégories déjà définies (course à pied, vélo, randonnée, autre), ou une nouvelle catégorisation est-elle nécessaire ? | **Mêmes catégories.** Aucune nouvelle catégorie n'est introduite. | 2026-07-29 |
| 5 | Les mesures physiologiques propres aux montres Garmin sans équivalent Strava (VO2max, charge d'entraînement, sommeil, stress, fréquence cardiaque au repos) doivent-elles être affichées, ou le périmètre se limite-t-il aux indicateurs déjà existants ? | **Hors périmètre.** Seuls les indicateurs déjà affichés pour Strava sont repris. | 2026-07-29 |
| 6 | Le mécanisme retenu pour obtenir les données Garmin devra-t-il respecter strictement l'exigence de coût d'exploitation nul, ou une exception (par exemple une étape exécutée sur le poste de l'utilisateur) est-elle acceptée ? | **Coût nul, strictement.** Aucune exception n'est accordée à l'article III de la constitution. | 2026-07-29 |
| 7 | Un historique Strava déjà présent localement au moment de l'arrivée des données Garmin doit-il être conservé, cumulé avec les activités Garmin, ou purgé ? | **Abandonné.** Aucune fusion ni migration ; seules les données Garmin sont conservées et affichées. | 2026-07-29 |

## 8. Définition de terminé

La fonctionnalité est livrée lorsque tous les critères d'acceptation des
scénarios de priorité Haute — **S1 et S2** — sont satisfaits et vérifiés.

La section 7 ne contient plus aucune question ouverte : la spécification est
close et peut passer en phase de planification technique.
