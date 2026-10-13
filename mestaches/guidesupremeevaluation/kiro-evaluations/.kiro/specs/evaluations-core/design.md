# Design — Évaluations (cœur)

Tout ce qui n'est pas dans ce fichier ni dans le steering est **à demander** (voir `steering/05-points-a-trancher.md`).

## 1. Modèle de données — schéma PostgreSQL `evaluations` (Tableau 6 + Figure 2)
Règle transversale à TOUTES les tables : `id` bigint (clé primaire interne, jamais exposée) + `uuid` (unique, seule exposée). Types/contraintes non précisés par la source : DECISION-11.

| Table | Rôle | Champs clés (source) |
|---|---|---|
| `matieres` | Référentiel des matières par établissement, avec coefficient par défaut | `tenant_id`, `nom`, `coefficient_defaut` |
| `evaluations` | Évaluation ponctuelle (devoir, composition, examen, composition en ligne) rattachée à une matière et une classe | `matiere_id`, `classe_id`, `type`, `coefficient`, `date`, `periode`, `est_composition_en_ligne`, `quiz_elearning_uuid`, `niveau_surveillance` |
| `notes` | Note d'un apprenant à une évaluation ; **source unique de tout calcul** | `apprenant_id`, `evaluation_id`, `valeur`, `saisi_par`, `date_saisie` |
| `bulletins` | Instantané calculé et archivé à la clôture d'une période | `apprenant_id`, `periode`, `moyenne`, `rang`, `mention`, `statut`, `pdf_document_id` |
| `modele_bulletin` | Modèle de mise en page et de barème par établissement/cycle | `tenant_id`, `cycle`, `en_tete`, `colonnes_affichees`, `echelle_appreciation`, `arrondi` |
| `contestation_note` | Suivi d'une contestation (parent/apprenant) | `note_id`, `demandeur_id`, `statut`, `motif`, `date_ouverture` |
| `audit_note` | Historique **immuable** de toute modification de note après publication | `note_id`, `auteur_id`, `valeur_avant`, `valeur_apres`, `motif`, `date` |
| `surveillance_incident` | Anomalie pendant une composition en ligne, **jamais de donnée biométrique** (phase 2) | `evaluation_id`, `apprenant_id`, `type_anomalie`, `horodatage`, `niveau_preuve` |

Notes :
- `apprenant_id`, `classe_id`, `tenant_id`, etc. référencent des entités d'**autres schémas** (`scolarite`, `etablissements`) ou du schéma courant : **aucune duplication** des données de ces schémas (nom, classe, etc.).
- Les colonnes `est_composition_en_ligne`, `quiz_elearning_uuid`, `niveau_surveillance` et la table `surveillance_incident` sont listées au Tableau 6 : les créer dans les migrations (nullable pour `evaluations`) même si la fonctionnalité est livrée en phase 2 — DECISION-06 à confirmer.
- Les tables `contestation_note`, `audit_note`, `notes`, `evaluations`, `matieres`, `bulletins`, `modele_bulletin` portent un `tenant_id` direct ou accessible par jointure (filtrage tenant obligatoire).

### Figure 2 décrite — diagramme de classes simplifié du schéma evaluations
Neuf classes UML :
1. **Matiere** : attributs `id:Integer`, `uuid:String`, `tenant_id:Integer`, `nom:String`, `coefficient_defaut:Float`. Méthodes : `findByEtablissement(tenant_id:Integer): List<Matiere>` ; `store(nom:String, coefficient_defaut:Float): Matiere`.
2. **Evaluation** : `id`, `uuid`, `matiere_id:Integer`, `classe_id:Integer`, `type:String`, `coefficient:Float`, `date:Date`, `periode:String`. Méthodes : `store(matiere_id, classe_id, type:String, date:Date): Evaluation` ; `findByClasse(classe_id:Integer, periode:String): List<Evaluation>` ; `cloturer(id:Integer): void`.
3. **Note** : `id`, `uuid`, `apprenant_id:Integer`, `evaluation_id:Integer`, `valeur:Float`, `saisi_par:Integer`. Méthodes : `saisir(apprenant_id, evaluation_id, valeur:Float): Note` ; `corriger(id:Integer, valeur:Float, motif:String): void` ; `findByApprenant(apprenant_id:Integer, periode:String): List<Note>`.
4. **Bulletin** : `id`, `uuid`, `apprenant_id`, `periode:String`, `moyenne:Float`, `rang:Integer`, `mention:String`, `statut:String`. Méthodes : `calculer(apprenant_id:Integer, periode:String): Bulletin` ; `publier(id:Integer): void` ; `genererPdf(id:Integer, modele_id:Integer): String`.
5. **ModeleBulletin** : `id`, `uuid`, `tenant_id`, `cycle:String`, `en_tete:String`, `echelle_appreciation:String`. Méthodes : `store(tenant_id:Integer, cycle:String): ModeleBulletin` ; `findByEtablissement(tenant_id:Integer, cycle:String): ModeleBulletin`.
6. **ContestationNote** : `id`, `note_id`, `demandeur_id`, `statut:String`, `motif:String`. Méthodes : `ouvrir(note_id:Integer, motif:String): ContestationNote` ; `resoudre(id:Integer, decision:String): void`.
7. **AuditNote** : `id`, `note_id`, `auteur_id`, `valeur_avant:Float`, `valeur_apres:Float`, `motif:String`. Méthode : `enregistrer(note_id:Integer, avant:Float, apres:Float): void`.

Relations (cardinalités) : **Matiere 1 —« porte »— 0..\* Evaluation** ; **Evaluation 1 —« génère »— 0..\* Note** ; **Note 0..\* —« alimente »— 1 Bulletin** (les notes alimentent le bulletin) ; **ModeleBulletin 1 —« s'applique à »— 0..\* Bulletin** ; **Note 1 —« fait l'objet de »— 0..\* ContestationNote** ; **Note 1 —« trace »— 0..\* AuditNote**.
Disposition : Matiere en haut, Evaluation dessous, ModeleBulletin en haut à droite, Note au centre, Bulletin à droite, ContestationNote et AuditNote en bas sous Note. Les noms de méthodes servent de guide pour les services Laravel, pas de contrat exact.

## 2. Composants et responsabilités
### 2.1 `CalculService` (moteur unique — PRIORITÉ ABSOLUE)
- Entrées : notes d'un apprenant sur une période, coefficients d'évaluation, coefficients de matière, paramètres du tenant (arrondi, règle « note non saisie : exclue ou 0 », rattrapage, classement activé/non, échelle d'appréciation).
- Sorties : moyenne, rang, mention, moyenne de classe, distribution (min/max/moyenne par matière).
- Formule (littérale de la source) : `moyenne = Σ(note × coef_évaluation × coef_matière) / Σ(coefficients)` — dénominateur : **DECISION-04**.
- Déterministe, sans effet de bord, sans lecture de la mise en forme. Appelé par : API web, génération PDF, endpoints internes.
- Aucun barème/coefficient/échelle/arrondi codé en dur : lus depuis la configuration du tenant.
- Mention de décision : la politique « note non saisie » est affichée dans le bulletin.

### 2.2 `BulletinService`
- Clôture de période : appelle `CalculService` pour chaque apprenant, écrit l'instantané (`bulletins`), publie l'événement, lance `GenererBulletinPdf`.
- Lecture : période ouverte → recalcul à la volée ; période clôturée → lecture de l'instantané/Redis, **reconstructible à l'identique**.

### 2.3 `TemplateService`
- Charge `modele_bulletin` (tenant + cycle) ou le modèle par défaut ; produit le PDF ; stocke dans `documents` (uuid) ; ne calcule rien.

### 2.4 Service Contestation
- Ouverture, statut (ouverte/en examen/résolue/rejetée), escalade à l'administrateur/censeur après délai configurable.

### 2.5 `RhClient`, `ScolariteClient`
- Requêtes SQL en lecture : `rh.affectations` (enseignant ↔ matière ↔ classe, valide à la date de saisie) ; `scolarite.classes`, `scolarite.apprenants` (appartenance apprenant ↔ classe) ; `etablissements.etablissements` (grille par défaut). Noms de colonnes : DECISION-18.

### 2.6 `RabbitMqPublisher`
- Publie sur un échange topic ; messages = événements de déclenchement uniquement.

### 2.7 Job `GenererBulletinPdf`
- Asynchrone via queue RabbitMQ ; < 5 s ; génère nouvelle version si correction post-publication ; l'ancienne reste archivée.

### 2.8 Cache Redis
- Clé par bulletin de période clôturée ; invalidation automatique sur `PUT /notes/{uuid}/corriger`.

## 3. API — contrats (Tableau 7)
Base `https://api-evaluations.e-academique.com/v1`. Réponses : uuid uniquement. Les champs ci-dessous sont **déduits strictement du modèle de données** ; formats d'erreur/pagination : DECISION-12.

| # | Méthode | Endpoint | Description (source) | Rôles | Règles clés |
|---|---|---|---|---|---|
| 1 | POST | `/notes` | Saisit ou met à jour une note (vérifie l'affectation enseignant via RH) | Enseignant | Affectation + appartenance classe ; période ouverte ; écrit `notes` |
| 2 | GET | `/notes/classe/{uuid}` | Liste les notes d'une classe pour une matière/période | Enseignant (ses classes), Admin/Censeur | Filtre tenant et affectation |
| 3 | POST | `/evaluations` | Crée une évaluation pour une classe/matière | Enseignant, Admin | Champs : matière, classe, type, coefficient, date, période |
| 4 | POST | `/periodes/{uuid}/cloturer` | Clôture une période, déclenche calcul + archivage des bulletins | Enseignant (ses notes) / Admin | Instantané + PDF async + événement |
| 5 | GET | `/bulletins/apprenant/{uuid}` | Bulletin courant ou archivé | Apprenant, Parent (enfants), Admin, Enseignant | Lecture seule |
| 6 | GET | `/bulletins/apprenant/{uuid}/pdf` | URL signée du PDF | idem | URL expirante |
| 7 | GET | `/classements/classe/{uuid}` | Classement et statistiques d'une classe | Enseignant, Admin | Respecte la désactivation du classement |
| 8 | POST | `/modeles-bulletin` | Crée ou met à jour le modèle de bulletin d'un établissement/cycle | Admin/Censeur | Champs : cycle, en_tete, colonnes_affichees, echelle_appreciation, arrondi |
| 9 | POST | `/contestations` | Ouvre une contestation | Parent, Apprenant | Statut initial « ouverte » |
| 10 | PUT | `/notes/{uuid}/corriger` | Corrige une note publiée, motif obligatoire | Admin/Censeur | Écrit `audit_note`, invalide cache, nouvelle version PDF |
| 11 | POST | `/compositions` | Programme une composition en ligne (crée le quiz côté E-learning) | Enseignant, Admin | **Phase 2** |
| 12 | GET | `/compositions/{uuid}/supervision` | Tableau de bord temps réel (niveau 3) | Admin/Censeur, surveillant habilité | **Phase 2** |
| 13 | POST | `/compositions/{uuid}/incidents` | Enregistre une anomalie détectée côté client | Client apprenant (authentifié) | **Phase 2** |
| 14 | GET | `/interne/eligibilite-document/{apprenant_uuid}` | Endpoint interne : disponibilité des bulletins pour une demande administrative | Microservices (Demandes) | DECISION-03 |

## 4. Cycle de génération du bulletin (§8.1) — séquence
1. L'enseignant clôture la saisie de ses notes de la période (verrou de sa saisie).
2. À la date de clôture générale, `POST /periodes/{uuid}/cloturer` : `CalculService` agrège les notes de chaque classe → moyenne, rang, mention par apprenant.
3. Instantané écrit dans `bulletins` ; bulletin disponible immédiatement en web.
4. Job `GenererBulletinPdf` mis en file RabbitMQ → PDF généré avec le modèle de l'établissement → stocké dans `documents` → `pdf_document_id` renseigné.
5. Événement RabbitMQ publié → Communication notifie parents et apprenants.
6. Téléchargement via URL signée expirante.

## 5. Cycle de correction post-clôture (§9) — séquence
1. Administrateur appelle `PUT /notes/{uuid}/corriger` avec valeur et **motif obligatoire**.
2. Mise à jour de `notes` + insertion immuable dans `audit_note` (avant/après/auteur/motif).
3. Invalidation du cache Redis ; recalcul du bulletin ; nouveau PDF (ancien archivé).
4. Événement publié si nécessaire (DECISION-19).

## 6. Figure 1 décrite — diagramme de cas d'utilisation
Cadre : « Microservice Evaluations ». Acteurs hors cadre : Gateway ; Enseignant ; Administrateur / Censeur ; Apprenant / Parent ; Autres microservices.
- Gateway → « Vérifier statut tenant / JWT ».
- Enseignant → « Saisir note » (relation « include » vers « Vérifier affectation (RH) ») ; → « Clôturer notes de sa classe » ; → « Programmer une composition en ligne » (« include » vers « Créer quiz (E-learning) »).
- Administrateur / Censeur → « Configurer coefficients et modèle de bulletin » ; → « Superviser une composition en direct ».
- Apprenant / Parent → « Consulter notes et bulletin » (« extend » depuis « Contester une note »). Une flèche apparaît aussi vers « Programmer une composition en ligne » — voir DECISION-07 (suivre le Tableau 1).
- Autres microservices → « Vérifier éligibilité via notes (Demandes) ».

## 7. Cas d'utilisation détaillés (Tableau 5)
| Cas | Description | Post-condition |
|---|---|---|
| Saisir une note | L'enseignant saisit une note pour un apprenant de sa classe/matière affectée | Ligne insérée/mise à jour dans `notes` |
| Clôturer les notes d'une période | L'enseignant ou l'administrateur verrouille la saisie pour déclencher le calcul | Bulletins calculés et instantané archivé |
| Programmer une composition en ligne | L'enseignant définit classe, date, durée et niveau de surveillance | Quiz créé côté E-learning, notification préalable envoyée |
| Passer une composition en ligne | L'apprenant compose dans la fenêtre programmée, chronomètre serveur | Tentative enregistrée côté E-learning, anomalies journalisées |
| Consulter un bulletin | Apprenant/parent consulte le bulletin de la période en cours ou archivée | Lecture seule, aucune écriture |
| Contester une note | Le parent/apprenant signale une note contestée | Entrée créée dans `contestation_note` |
| Corriger une note publiée | L'administrateur modifie une note déjà intégrée à un bulletin clos, avec motif | Note mise à jour + entrée `audit_note` + nouveau PDF |

## 8. Docker / CI
Voir `steering/02-technique.md` §7. Healthcheck `/health`. Image taggée sha du commit. Secrets via GitHub Actions Secrets.

## 9. Planning de référence (Tableau 9 + Figure 5 décrite)
Gantt « Feuille de route — Microservice Évaluations (10 jours ouvrés) » : deux équipes en parallèle. Ligne « Toutes équipes » : Phase 0 (cadrage, barre grise au début) et Phase 8 (tests/recette/déploiement, à la fin). Ligne « Cœur calcul » : Phases 1 → 2 → 3 en escalier. Ligne « Bulletins & intégrations » : Phase 4 démarre tôt en parallèle de la phase 1/2 ; Phases 5, 6, 7 ensuite ; 6 et 7 en fin de parcours, juste avant la phase 8. Les durées exactes sont dans `tasks.md`.
