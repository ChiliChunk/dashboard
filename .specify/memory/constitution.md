# Constitution — Dashboard Strava

> Principes non négociables du projet. Toute spec, tout plan, toute tâche et tout
> code doivent s'y conformer. En cas de conflit entre ce document et une demande
> ponctuelle, ce document l'emporte — ou la constitution doit être amendée
> explicitement (section Amendements).

**Version** : 1.0.0
**Dernière révision** : 2026-07-29

---

## I. La spécification fait foi

Aucune ligne de code n'est écrite avant qu'une spec validée n'existe pour la
fonctionnalité concernée. Le code est une projection de la spec, jamais l'inverse.

Si l'implémentation révèle que la spec est fausse ou incomplète : on **arrête
d'implémenter**, on corrige la spec, on régénère. On ne « rattrape » pas dans le
code un besoin qui n'est pas écrit.

## II. Aucun secret n'atteint le navigateur

Le `client_secret` Strava, les tokens d'accès à longue durée et toute clé d'API
ne transitent ni ne résident dans du code livré au client.

Corollaire : tout échange OAuth passe par un composant de confiance côté serveur.
Le `access_token` de courte durée peut vivre en mémoire côté client ; le
`refresh_token`, non.

## III. Coût d'exploitation nul par défaut

L'architecture cible tient dans les paliers gratuits (hébergement statique +
fonction serverless scale-to-zero). Toute proposition impliquant une machine
allumée en permanence, une base de données managée ou un abonnement doit être
justifiée explicitement dans le plan et validée avant implémentation.

## IV. Le quota Strava est une ressource rare

L'API Strava plafonne à 200 requêtes / 15 minutes et 2 000 / jour.

- Toute réponse de l'API est mise en cache côté client avant réaffichage.
- Aucune requête n'est émise pour des données déjà présentes en cache et non périmées.
- La pagination des activités est incrémentale : on ne recharge jamais l'historique complet quand seules les nouvelles sorties manquent.
- Le dépassement de quota est un cas d'erreur traité par l'interface, pas une exception non gérée.

## V. Typage strict, données validées aux frontières

TypeScript en mode `strict`. `any` interdit hors justification écrite en commentaire.

Toute donnée entrant dans l'application (réponse API, contenu de cache, paramètre
d'URL) est validée par un schéma à la frontière. À l'intérieur du domaine, les
types sont tenus pour acquis.

## VI. La logique métier est testée, l'interface est vérifiée

Sont couverts par des tests unitaires, sans exception : calculs d'agrégats,
conversions d'unités, décodage des tracés GPS, découpage temporel, filtres.

L'interface n'exige pas de couverture exhaustive, mais aucun calcul ne réside
dans un composant de rendu.

## VII. Une dataviz qui ment est un bug

- Les axes ne sont pas tronqués sans mention explicite.
- Les unités sont affichées systématiquement.
- L'absence de donnée se distingue visuellement d'une valeur nulle.
- Les palettes restent lisibles en déficience de perception des couleurs, et le
  daltonisme rouge-vert ne doit jamais être le seul canal porteur d'information.

## VIII. Frugalité des dépendances

Toute nouvelle dépendance runtime est justifiée dans le plan : ce qu'elle apporte,
son poids, et pourquoi la réécrire coûterait plus cher. Les micro-utilitaires
remplaçables par dix lignes sont refusés.

---

## Amendements

Toute modification de ce document est datée, versionnée (semver : majeur =
principe retiré ou inversé, mineur = principe ajouté, patch = reformulation) et
accompagnée de sa justification.

| Version | Date       | Nature                |
|---------|------------|-----------------------|
| 1.0.0   | 2026-07-29 | Rédaction initiale.   |
