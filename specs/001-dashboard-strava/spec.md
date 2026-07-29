# Spécification — Dashboard de visualisation des sorties sportives Strava

**Identifiant** : 001-dashboard-strava
**Statut** : Validée
**Date** : 2026-07-29 (rédaction) · 2026-07-29 (validation) · 2026-07-29 (amendement maquette)
**Référence visuelle** : `design/maquette-tableau-de-bord.html`

---

## 1. Problème

L'application Strava présente les activités sous forme de flux chronologique
orienté social. Elle répond mal à la question « comment ai-je évolué ? » : les
comparaisons entre périodes sont laborieuses, les agrégats personnalisés
inexistants, et les statistiques poussées réservées à l'abonnement payant.

Un pratiquant qui veut lire sa propre pratique — volume mensuel, répartition par
sport, progression du rythme, saisonnalité — n'a aujourd'hui d'autre recours que
d'exporter ses données et de les manipuler dans un tableur.

Cette fonctionnalité fournit une vue analytique personnelle de l'historique
d'activités, consultable en quelques secondes, sans manipulation manuelle.

## 2. Utilisateurs visés

**Utilisateur unique : le propriétaire du compte Strava connecté.**

Pratiquant régulier de trois disciplines — **course à pied** (trail compris),
**vélo** et **randonnée** —, à l'aise avec une interface web, sans compétence en
analyse de données. Consulte principalement sur ordinateur, occasionnellement sur
mobile. Dispose d'un historique allant de quelques dizaines à plusieurs milliers
d'activités.

## 3. Périmètre exclu

Ne font **pas** partie de cette fonctionnalité :

- Toute écriture vers Strava : création, modification ou suppression d'activité.
- Les fonctions sociales : kudos, commentaires, clubs, segments, classements.
- La comparaison avec d'autres athlètes, quels qu'ils soient.
- L'analyse de flux haute fréquence intra-activité (courbes de puissance seconde
  par seconde, analyse de zones cardiaques détaillée).
- L'hébergement multi-comptes : l'application sert un utilisateur à la fois.
- L'export de données vers d'autres formats ou services.
- Le système d'unités impérial : l'application est métrique uniquement (décision Q3).
- L'objectif hebdomadaire et son suivi de progression : la carte présente en tête
  de la maquette de référence relève de la fonctionnalité **002**, pas de
  celle-ci (décision Q7). L'implémentation de 001 omet cette carte.
- Le thème clair : l'application est en thème sombre uniquement (décision Q10).

## 4. Scénarios utilisateur

### S1 — Connecter son compte Strava · Priorité : Haute

**En tant que** propriétaire d'un compte Strava, **je veux** autoriser
l'application à lire mes activités, **afin de** consulter mes données sans avoir
à les exporter manuellement.

Déroulé nominal :
1. L'utilisateur arrive sur l'application, non connecté.
2. Il déclenche la connexion et est redirigé vers la page d'autorisation Strava.
3. Il accorde l'accès en lecture à ses activités.
4. Il est ramené sur l'application, désormais authentifié, et la récupération de
   ses données démarre.

Critères d'acceptation :
- [ ] CA1.1 — Un utilisateur non connecté ne voit aucune donnée d'activité, seulement l'invitation à se connecter.
- [ ] CA1.2 — L'autorisation demandée à Strava se limite à la lecture des activités ; aucune permission d'écriture n'est sollicitée.
- [ ] CA1.3 — À l'issue de l'autorisation, l'utilisateur retrouve la page d'où il est parti.
- [ ] CA1.4 — Un refus d'autorisation côté Strava ramène l'utilisateur sur l'application avec un message explicite, sans état d'erreur bloquant.
- [ ] CA1.5 — La session persiste entre deux visites : un utilisateur ayant déjà autorisé l'application n'a pas à recommencer la procédure à chaque ouverture.
- [ ] CA1.6 — L'utilisateur peut se déconnecter ; cette action efface localement l'intégralité de ses données et de sa session.

### S2 — Lire une synthèse de sa pratique · Priorité : Haute

**En tant que** pratiquant, **je veux** voir en un écran l'essentiel de mon
activité sur une période, **afin de** savoir où j'en suis sans fouiller.

Déroulé nominal :
1. L'utilisateur connecté arrive sur la vue de synthèse.
2. Il voit les indicateurs agrégés de la période par défaut.
3. Il change de période et les indicateurs se recalculent.

Critères d'acceptation :
- [ ] CA2.1 — La synthèse affiche au minimum : nombre de sorties, distance totale, durée totale, dénivelé positif cumulé.
- [ ] CA2.2 — Chaque indicateur est comparé à la période équivalente précédente, avec le sens de la variation.
- [ ] CA2.3 — La répartition par type de sport est visible sur la période.
- [ ] CA2.4 — Les périodes proposées comprennent au moins : **semaine en cours**, 30 derniers jours, année en cours, année précédente, historique complet. La semaine en cours est la période sélectionnée par défaut à l'ouverture.
- [ ] CA2.5 — Une période sans aucune activité affiche un état vide explicite, distinct d'un état de chargement et distinct de valeurs à zéro.
- [ ] CA2.6 — Toute valeur affichée porte son unité.
- [ ] CA2.7 — Lorsque la période sélectionnée est la semaine en cours, la synthèse présente en complément la répartition jour par jour, du lundi au dimanche.
- [ ] CA2.8 — Dans cette répartition, un jour encore à venir se distingue visuellement d'un jour écoulé sans activité. Les deux se distinguent d'un jour actif.
- [ ] CA2.9 — La période affichée est nommée en toutes lettres avec ses bornes de dates.

### S3 — Explorer et filtrer ses sorties · Priorité : Haute

**En tant que** pratiquant, **je veux** parcourir mes sorties et les restreindre
à un sous-ensemble, **afin de** retrouver une sortie précise ou isoler une
pratique.

Critères d'acceptation :
- [ ] CA3.1 — La liste présente pour chaque sortie : date, nom, type de sport, distance, durée, dénivelé.
- [ ] CA3.2 — La liste est filtrable par type de sport et par intervalle de dates.
- [ ] CA3.3 — La liste est triable par date, distance et durée, dans les deux sens.
- [ ] CA3.4 — Les filtres actifs sont visibles et annulables individuellement.
- [ ] CA3.5 — Les indicateurs de la vue de synthèse reflètent les filtres actifs.
- [ ] CA3.6 — Un historique de 5 000 activités reste navigable sans blocage perceptible de l'interface.
- [ ] CA3.7 — Un filtre ne renvoyant aucun résultat affiche un état vide invitant à l'élargir.

### S4 — Consulter le détail d'une sortie · Priorité : Moyenne

**En tant que** pratiquant, **je veux** ouvrir une sortie, **afin de** revoir son
parcours et ses caractéristiques.

Critères d'acceptation :
- [ ] CA4.1 — Le détail affiche le tracé de la sortie sur un fond cartographique, quand la sortie contient des données de position.
- [ ] CA4.2 — Une sortie sans données de position s'affiche normalement, avec une mention explicite de l'absence de tracé — jamais une carte vide ou une erreur.
- [ ] CA4.3 — Le détail affiche : date et heure de départ, distance, durée de déplacement, durée totale, dénivelé positif, allure ou vitesse moyenne.
- [ ] CA4.4 — Les indicateurs optionnels (fréquence cardiaque, puissance, cadence) ne s'affichent que lorsqu'ils sont réellement présents dans la sortie.
- [ ] CA4.5 — L'allure est exprimée en min/km pour les sports à pied, en km/h pour les sports roulants.
- [ ] CA4.6 — Un lien permet d'ouvrir la sortie correspondante sur Strava.

### S5 — Suivre sa progression dans le temps · Priorité : Moyenne

**En tant que** pratiquant, **je veux** visualiser l'évolution de mon volume et
de mes performances, **afin de** constater ma progression ou mon relâchement.

Critères d'acceptation :
- [ ] CA5.1 — Un graphique présente le volume par unité de temps (semaine ou mois, au choix) sur la période sélectionnée.
- [ ] CA5.2 — La grandeur représentée est sélectionnable : distance, durée, ou dénivelé.
- [ ] CA5.3 — Le graphique respecte les filtres de sport actifs.
- [ ] CA5.4 — Les périodes sans activité apparaissent comme des creux réels, et non comme des points absents reliés par interpolation.
- [ ] CA5.5 — Les axes portent leur unité et ne sont pas tronqués sans mention visible.
- [ ] CA5.6 — Le survol ou la sélection d'un point en donne la valeur exacte et la période exacte.
- [ ] CA5.7 — La grandeur d'une période peut être ventilée par sport à l'intérieur d'une même barre, avec une légende. La ventilation ne repose pas sur la seule couleur (ENF6).
- [ ] CA5.8 — La moyenne par période sur l'intervalle affiché est indiquée à proximité du graphique, avec son unité.

### S6 — Retrouver ses données sans attendre · Priorité : Haute

**En tant que** pratiquant, **je veux** que l'application se souvienne de mes
données entre deux visites, **afin de** ne pas subir un rechargement complet à
chaque ouverture.

Critères d'acceptation :
- [ ] CA6.1 — À la seconde ouverture, les données déjà connues s'affichent avant toute nouvelle interrogation de Strava.
- [ ] CA6.2 — Seules les activités postérieures à la dernière synchronisation sont récupérées.
- [ ] CA6.3 — La date de dernière synchronisation est affichée.
- [ ] CA6.4 — L'utilisateur peut forcer une resynchronisation complète.
- [ ] CA6.5 — Une première synchronisation de plusieurs milliers d'activités affiche une progression, et les données déjà reçues restent consultables pendant que le reste arrive.

## 5. Cas limites et erreurs

| Situation | Comportement attendu |
|-----------|----------------------|
| Quota Strava atteint (200 req/15 min ou 2 000/jour) | Message explicite indiquant le délai avant reprise ; les données déjà récupérées restent consultables ; la synchronisation reprend là où elle s'est arrêtée. |
| Autorisation révoquée par l'utilisateur depuis Strava | Retour à l'état non connecté avec explication ; les données locales sont effacées. |
| Session expirée en cours d'utilisation | Renouvellement transparent si possible ; sinon, invitation à se reconnecter sans perte de la vue courante. |
| Perte de connexion réseau | Les données en cache restent consultables ; l'absence de synchronisation est signalée. |
| Activité manuelle (sans GPS ni capteur) | Affichée dans les listes et les agrégats ; les indicateurs manquants sont marqués comme absents, jamais comme zéro. |
| Activité de type inconnu ou nouveau sport Strava | Traitée dans une catégorie « Autre » plutôt qu'ignorée ou provoquant une erreur. |
| Valeur aberrante (distance nulle, durée nulle, vitesse impossible) | L'activité reste listée ; les calculs dérivés impossibles ne sont pas affichés plutôt que d'afficher un résultat faux. |
| Compte sans aucune activité | État vide explicite et accueillant, pas un tableau de bord rempli de zéros. |

## 6. Exigences non fonctionnelles

**Sécurité**
- ENF1 — Aucun secret d'application (identifiant secret Strava, jeton de rafraîchissement) n'est accessible depuis le code s'exécutant dans le navigateur, ni lisible dans le trafic réseau côté client.
- ENF2 — Les données d'activité de l'utilisateur ne transitent par aucun tiers autre que Strava, et ne sont stockées sur aucun serveur.

**Coût**
- ENF3 — L'exploitation tient dans les paliers gratuits d'hébergement, sans processus serveur maintenu en permanence.

**Performance**
- ENF4 — Sur un historique déjà en cache, la vue de synthèse est utilisable en moins de 2 secondes après ouverture.
- ENF5 — L'application d'un filtre produit un résultat en moins de 300 ms sur 5 000 activités.

**Accessibilité**
- ENF6 — Aucune information n'est portée par la seule couleur.
- ENF7 — L'ensemble des fonctions est utilisable au clavier.
- ENF8 — Les contrastes respectent le niveau AA des WCAG 2.1.

**Compatibilité**
- ENF9 — Fonctionne sur les versions courantes de Chrome, Firefox et Safari, sur écrans de 360 px à 2 560 px de large.

## 7. Points à clarifier

Toutes les questions ont reçu une décision. La spec est close.

| # | Question | Décision | Date |
|---|----------|----------|------|
| Q1 | ENF1 et ENF3 sont en tension : l'API Strava impose l'usage de l'identifiant secret pour l'échange et le rafraîchissement des jetons, ce qui interdit une application strictement sans composant serveur. Trois options : **(a)** une fonction serverless minimale, sans état, ne servant qu'à cet échange, en palier gratuit scale-to-zero ; **(b)** une application installée localement, le secret restant sur la machine de l'utilisateur ; **(c)** relâcher ENF1 et accepter le secret dans le navigateur. | **Option (a)**. Le secret réside exclusivement dans une fonction serverless sans état, dont le seul rôle est l'échange et le rafraîchissement des jetons. Le reste de l'application est statique et s'exécute intégralement dans le navigateur. ENF1 et ENF3 sont tous deux tenus. | 2026-07-29 |
| Q2 | Profondeur d'historique à récupérer : l'intégralité du compte, ou une limite (par exemple 5 ans) pour borner la première synchronisation ? | **Intégralité de l'historique**, récupérée progressivement et par pages. La durée de la première synchronisation est acceptée en contrepartie ; CA6.5 impose d'en afficher la progression et de rendre consultables les données déjà reçues. | 2026-07-29 |
| Q3 | Unités : métrique uniquement, ou bascule métrique/impérial ? | **Métrique uniquement.** Le système impérial est hors périmètre et rejoint la section 3. | 2026-07-29 |
| Q4 | CA6.1 implique de conserver l'historique d'activités sur la machine de l'utilisateur entre deux sessions. Est-ce acceptable au regard de la confidentialité attendue, sachant que le poste peut être partagé ? | **Oui**, la persistance locale est retenue, conditionnée à l'effacement intégral des données et de la session à la déconnexion (CA1.6). C'est la condition du respect du quota Strava en usage courant. | 2026-07-29 |
| Q5 | La vue de synthèse doit-elle distinguer les sports au sein des indicateurs (une ligne par sport) ou les agréger toutes pratiques confondues avec un filtre à part ? | **Agrégat global.** La ventilation par sport reste assurée par CA2.3, et l'isolement d'une pratique par les filtres de S3. | 2026-07-29 |
| Q6 | Priorité S6 fixée à « Basse », alors que CA6.2 (synchronisation incrémentale) conditionne le respect du quota Strava en usage courant. Faut-il remonter S6 en priorité Haute ? | **Oui, S6 passe en priorité Haute.** Sans synchronisation incrémentale, le quota de 200 requêtes / 15 minutes est épuisé dès les premiers rechargements : il s'agit d'une condition de fonctionnement et non d'un confort. S6 entre par conséquent dans la définition de terminé. | 2026-07-29 |

**Amendement du 2026-07-29 — apport de la maquette de référence.** Les questions
suivantes sont nées de la confrontation de la spec avec `design/maquette-tableau-de-bord.html`.

| # | Question | Décision | Date |
|---|----------|----------|------|
| Q7 | La maquette place en tête une carte « objectif hebdomadaire » (volume visé, pourcentage atteint, jours restants, reste à parcourir). Aucun critère de cette spec ne la couvre : besoin nouveau ou décor ? | **Besoin réel, mais reporté en fonctionnalité 002.** La fonctionnalité 001 se livre sans cette carte. La maquette ne sera donc pas reproduite à l'identique au premier jet — écart assumé et tracé ici. | 2026-07-29 |
| Q8 | La maquette est construite autour de la semaine en cours, période absente de CA2.4. | **Semaine en cours ajoutée à CA2.4 et retenue comme période par défaut.** Les périodes déjà validées sont conservées. Deux critères en découlent : CA2.7 (répartition jour par jour) et CA2.8 (distinction du jour à venir). | 2026-07-29 |
| Q9 | La légende de la maquette distingue quatre sports (course, vélo/VTT, trail, randonnée) là où la spec mentionnait course, vélo, marche et natation. | **Trois catégories nommées : course à pied — le trail y est fusionné —, vélo, randonnée.** Une quatrième catégorie « Autre » est conservée, non par choix mais par nécessité : le cas limite « activité de type inconnu » (section 5) interdit d'ignorer une activité, et l'historique Strava peut contenir n'importe quel type. « Autre » n'apparaît dans les légendes que si des activités s'y rattachent réellement. | 2026-07-29 |
| Q10 | La maquette est en thème sombre. Faut-il aussi un thème clair ? | **Thème sombre uniquement.** Le thème clair rejoint le périmètre exclu. Une seule palette est à concevoir et à vérifier au contraste. | 2026-07-29 |
| Q11 | Quelle autorité donner à la maquette sur les écrans qu'elle ne montre pas ? | **La maquette fait autorité sur le registre visuel** — palette, typographie, densité, forme des composants — et sur les vues qu'elle représente. **Elle ne fait pas autorité par omission** : les écrans absents (connexion, statut de synchronisation, détail d'une sortie, états vides, quota atteint, rendu mobile) sont conçus dans son prolongement, sans qu'un accord préalable soit requis pour chacun. | 2026-07-29 |

**Écarts connus entre la maquette et la spec, assumés en l'état :**

- La maquette n'offre le choix qu'entre distance et durée ; CA5.2 prévoit en outre le dénivelé. Le critère l'emporte : les trois grandeurs seront proposées.
- Dans les barres empilées de la maquette, le sport n'est encodé que par la couleur. ENF6 l'interdit : CA5.7 impose un second canal de distinction.
- La maquette ne montre que trois lignes de sorties. CA3.6 (5 000 activités) et CA3.2/CA3.3 (filtre par dates, tri) restent exigibles et devront être conçus dans son prolongement.

## 8. Définition de terminé

La fonctionnalité est livrée lorsque tous les critères d'acceptation des
scénarios de priorité Haute — **S1, S2, S3 et S6** — sont satisfaits et vérifiés,
et que les exigences ENF1 à ENF3 sont démontrées.

S4 et S5, de priorité Moyenne, sont attendus mais ne bloquent pas la livraison.

La section 7 ne contient plus aucune question ouverte : la spécification est
close et peut passer en phase de planification technique.
