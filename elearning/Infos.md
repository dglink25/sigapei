E-ACADÉMIQUE
CAHIER DES CHARGES - MICROSERVICE E-LEARNING
Sous-ensemble du cahier des charges plateforme « E-Académique »
Contient : périmètre fonctionnel, diagrammes de cas d'utilisation, diagrammes de séquence, modèles
entité-association, règles de gestion et contraintes techniques.
Version : 1.0
Statut : Document de cadrage technique
Périmètre : Microservice E-learning (api-elearning.e-academique.com)
Stack retenue : Django / Django REST Framework (backend) + React (frontend partagé)
E-Académique - Microservice E-learning
Page 1 / 21
1. Contexte et rattachement au projet E-Académique
E-Académique est une plateforme SaaS multi-tenant de gestion scolaire, conçue autour d'une base de données
unique PostgreSQL organisée en douze schémas logiques, chacun étant la propriété exclusive d'un
microservice. Le présent document se concentre sur l'un d'entre eux : le microservice E-learning (schéma
elearning, exposé sous api-elearning.e-academique.com), développé en Django avec Django REST
Framework.
Ce microservice porte l'ensemble des activités pédagogiques numériques réalisées en dehors de la classe
physique : mise à disposition de cours, dépôt et correction de devoirs, quiz et auto-évaluations, bibliothèque
numérique de ressources. Il s'appuie sur le socle commun de la plateforme (authentification SSO, passerelle
API, base unique) et respecte les mêmes principes transverses que le reste de la plateforme : cloisonnement
strict par tenant_id, absence de duplication de données entre modules, et exposition exclusive d'UUID (et de
slugs d'établissement) dans les URLs et réponses API, jamais d'identifiants internes auto-incrémentés.
Le choix de Django diffère de l'indication initiale « Node.js / Deno » du cahier des charges plateforme : le
microservice E-learning est traité comme une exception technologique assumée au sein de l'architecture
polyglotte en microservices, chaque service restant libre de sa technologie tant qu'il respecte le contrat d'API et
le schéma de données partagé. Il n'a pas d'application séparée : ses écrans sont des vues intégrées à la Web
App / PWA unique (app.e-academique.com).
Ce cahier des charges détaille, pour ce microservice spécifiquement, les éléments du cahier des charges mère
de la plateforme, et y ajoute les livrables de modélisation demandés pour le lot de développement : diagrammes
de cas d'utilisation, diagrammes de séquence et diagrammes entité-association.
2. Périmètre fonctionnel
2.1. État de l'art et positionnement
Problème identifié : dans le contexte scolaire visé (Bénin et Afrique de l'Ouest, du primaire à l'universitaire), la
continuité pédagogique en dehors des heures de classe repose sur des supports dispersés : polycopiés papier,
groupes WhatsApp, clés USB, ou absence pure et simple de ressources numériques structurées. Il en résulte
une absence de traçabilité de ce qui a été publié, consulté ou rendu par chaque apprenant, une correction
manuelle chronophage pour les enseignants (en particulier sur de gros effectifs), des ressources difficiles à
retrouver d'une année sur l'autre, et aucun lien direct entre le travail réalisé en ligne et le carnet de notes officiel.
Les contraintes de connectivité (bande passante limitée, connexions intermittentes) rendent en outre risqué
l'hébergement vidéo interne sans solution d'optimisation et de diffusion adaptative.
Positionnement proposé : en s'appuyant sur la base de données unique de la plateforme, le report d'une note
de devoir ou de quiz s'écrit directement dans evaluations.notes, sans export ni double saisie ; la vidéo est
externalisée chez Cloudinary avec streaming adaptatif, sans serveur de streaming à maintenir ; et la correction
des questions ouvertes courtes est assistée par intelligence artificielle, l'enseignant conservant toujours le dernier
mot sur la note officielle. Ce choix positionne le module comme plus intégré qu'une plateforme de cours
autonome, dont les notes restent le plus souvent dans un système distinct du carnet officiel.
2.2. Objectifs du module
Objectif général : permettre à chaque établissement de publier, diffuser et suivre des contenus pédagogiques
numériques (cours, devoirs, quiz, ressources), avec une correction assistée par intelligence artificielle et un lien
direct et automatisable vers le carnet de notes officiel.
Objectifs spécifiques :
• Permettre à un enseignant de publier un cours (texte, document, vidéo) rattaché à sa matière et à ses
classes ;
• Permettre à un enseignant de créer un devoir avec date limite et pièces jointes ;
• Permettre à un apprenant de consulter les cours de ses matières et de soumettre un devoir en ligne ;
E-Académique - Microservice E-learning
Page 2 / 21
• Permettre la création de quiz corrigés automatiquement, y compris les réponses ouvertes courtes via une
correction assistée par IA ;
• Permettre le report, à la demande de l'enseignant, d'une note de devoir ou de quiz vers le module
Évaluations, sans double saisie ;
• Fournir une bibliothèque numérique de ressources consultable par matière et par classe ;
• Garantir un usage fluide en connexion faible grâce à un streaming vidéo adaptatif externalisé.
2.3. Périmètre de la version 1
Inclus dans le périmètre (V1) :
• Publication de cours par matière et par classe : texte riche, documents (PDF, images), vidéos hébergées et
streamées via Cloudinary (pas d'hébergement vidéo interne, pas de HLS auto-hébergé) ;
• Devoirs : création, dépôt de fichiers par l'apprenant, date limite, note ;
• Quiz : QCM, vrai/faux et questions ouvertes courtes ; correction automatique - barème classique pour les
QCM, moteur de correction assisté par IA pour les questions ouvertes (comparaison sémantique à une
réponse de référence fournie par l'enseignant) ;
• Report optionnel d'une note de devoir ou de quiz vers evaluations.notes, initié par l'enseignant ;
• Bibliothèque numérique de ressources, organisée par matière et par classe ;
• Statistiques de base : taux de complétion, moyenne par quiz/devoir, activité par classe.
Explicitement hors périmètre (V1) :
• Visioconférence et classes virtuelles en direct - à réévaluer en V2+ ;
• Hébergement vidéo auto-géré (HLS interne, serveur de streaming propre) - le choix retenu est un service
externe (Cloudinary) ;
• Détection de plagiat sur les devoirs soumis ;
• Correction manuelle assistée (annotation de copie, correction collaborative) ;
• Gamification avancée (badges, classements ludiques) ;
• Génération automatique de contenu de cours par IA - seule la correction de quiz utilise l'IA.
2.4. Fonctionnalités par domaine
Cours. Création, modification et archivage d'un cours rattaché à une matière, à une ou plusieurs classes et à
l'enseignant auteur. Un cours se compose de blocs ordonnés en leçons : texte riche, pièce jointe (PDF, image)
ou vidéo Cloudinary (upload direct depuis l'interface, transcodage et miniature générés automatiquement côté
Cloudinary). Chaque cours porte un statut (brouillon, publié, archivé) et une date de publication programmable.
Devoirs. Énoncé, pièces jointes, date limite, note maximale, matière et classe cibles. L'apprenant dépose un ou
plusieurs fichiers ; un indicateur de retard est posé automatiquement après la date limite (comportement
paramétrable : blocage ou pénalité). La notation est manuelle, avec commentaire. Une nouvelle soumission
remplace ou s'ajoute à la précédente selon la règle définie par l'enseignant.
Quiz et auto-évaluations. QCM (une ou plusieurs bonnes réponses), vrai/faux et questions ouvertes courtes.
Les QCM et vrai/faux sont corrigés par barème strict ; pour les questions ouvertes, l'enseignant fournit une
réponse de référence et un barème, le moteur IA propose une note par similarité sémantique et l'enseignant peut
l'ajuster avant validation finale. La restitution du score est paramétrable (immédiate ou différée jusqu'à
validation), avec tentatives multiples et chronométrage optionnels.
Bibliothèque numérique. Dépôt de ressources indépendantes d'un cours précis (fiches, annales, supports
complémentaires), classées par matière, classe, cycle et mots-clés, avec recherche et filtres (matière, type de
fichier, enseignant auteur, date).
Report vers Évaluations. Action explicite de l'enseignant (« Reporter cette note vers le bulletin »), écriture
directe dans evaluations.notes, traçabilité de l'origine de la note (devoir ou quiz e-learning) conservée pour audit.
E-Académique - Microservice E-learning
Page 3 / 21
Notifications et tableaux de bord. Notification à la publication d'un cours ou d'un devoir et à la correction d'un
quiz. Tableau de bord enseignant : devoirs à corriger, quiz en attente de validation IA, taux de rendu par classe.
Tableau de bord apprenant : devoirs à rendre, quiz disponibles, dernières ressources publiées.
2.5. Règle spécifique : correction assistée par IA
Décision d'équipe : l'intelligence artificielle est utilisée uniquement pour la correction des questions ouvertes
courtes des quiz. Elle compare la réponse de l'apprenant à la réponse de référence de l'enseignant et propose
une note, stockée dans la colonne note_ia. Cette note n'est jamais une note officielle : seule la colonne
note_finale, renseignée ou confirmée par l'enseignant, fait foi, et aucun report vers evaluations.notes n'est
possible tant que cette validation n'a pas eu lieu. Toute modification d'une note par l'enseignant après correction
IA est journalisée dans audit_log. Le module ne génère aucun contenu de cours par IA et n'intègre aucune
détection de plagiat.
2.6. Règle spécifique : accès des apprenants sans compte (programme béninois)
Le cahier des charges du lot Inscription & Scolarité prévoit que, pour une classe suivant le programme béninois,
l'apprenant n'a pas de compte de connexion propre (colonne utilisateur_id nulle, accès via le compte du parent
par la table parents_apprenants). Cette règle a une conséquence directe sur le module E-learning, qui suppose
qu'un apprenant consulte des cours, dépose des devoirs et passe des quiz.
Règle proposée : pour ces classes, le parent rattaché ouvre l'espace e-learning de son enfant depuis son propre
compte et agit en son nom (dépôt de devoir, passage de quiz). Les données sont toujours attribuées à
l'apprenant (apprenant_id), tandis que la colonne soumis_par conserve le compte réellement utilisé, pour l'audit.
Pour les classes du programme français et pour le cycle universitaire, le comportement standard s'applique
(compte propre de l'apprenant, parent en lecture seule). Ce point déroge au principe « parent en lecture seule »
du cahier des charges initial du module et doit être validé par l'équipe.
3. Acteurs
Les acteurs suivants interagissent directement avec le microservice E-learning. Le Super Administrateur de la
plateforme n'accède à aucun contenu pédagogique : il ne consulte que des statistiques d'usage agrégées.
Acteur Rôle vis-à-vis du microservice E-learning
Enseignant Publie des cours et ressources, crée des devoirs et quiz, consulte les soumissions et les
scores générés par l'IA, valide ou ajuste une note avant report vers Évaluations. Limité à ses
matières et classes affectées (vérifié par jointure sur rh.affectations).
Apprenant (écolier, élève,
étudiant)
Consulte les cours et ressources de ses matières, réalise les quiz, dépose ses devoirs,
consulte ses scores et corrections.
Parent Consultation en lecture seule de l'activité e-learning de chaque enfant rattaché (table
parents_apprenants) : devoirs rendus ou en retard, scores de quiz, selon les droits accordés
par l'établissement. Exception : classes du programme béninois (section 2.6).
Administrateur (Fondateur) Active ou désactive le module pour son établissement (selon son plan), configure les
paramètres globaux (ex. tentatives multiples par défaut), consulte les statistiques d'usage.
Super Administrateur
(plateforme)
Supervise l'usage consolidé du module sur l'ensemble des établissements, sans aucun accès
au contenu pédagogique. Son rôle (activation des modules) relève du microservice
Établissements.
Ces cinq profils ne ferment pas la liste des acteurs possibles. Conformément au système de rôles dynamiques
porté par le microservice Identité, l'administrateur d'un établissement peut créer des rôles personnalisés - par
exemple Chef de département ou Responsable pédagogique - et leur accorder, module par module, un accès à
tout ou partie des fonctions du module E-learning : par exemple la consultation des statistiques d'usage sans
droit de modification des contenus. Ce sont les permissions accordées, et non le nom du rôle, qui déterminent les
actions réellement accessibles.
E-Académique - Microservice E-learning
Page 4 / 21
4. Diagrammes de cas d'utilisation
Les cas d'utilisation sont présentés en deux ensembles, afin de distinguer les fonctions de contenu (cours,
bibliothèque, administration du module) de celles d'évaluation (devoirs, quiz, report de notes). Les dépendances
vers un service externe - par exemple le report d'une note vers le microservice Évaluations - sont
matérialisées par une flèche pointillée « uses » vers une boîte externe.
4.1. Contenus pédagogiques : cours, bibliothèque et administration
Figure 1 - Diagramme de cas d'utilisation : contenus pédagogiques
Cas d'utilisation Acteur(s) principal(aux) Description sommaire
Créer / modifier / archiver un
cours
Enseignant Gérer un cours rattaché à une matière, à une ou plusieurs
classes et à l'enseignant auteur ; statut brouillon, publié ou
archivé ; publication programmable.
Composer les leçons Enseignant Ajouter et ordonner des blocs (texte riche, pièce jointe, vidéo).
La vidéo est envoyée directement à Cloudinary ; dépend d'un
service externe.
Consulter un cours Apprenant (et enseignant
auteur)
Lire les leçons d'un cours de sa classe ; la qualité vidéo s'adapte
au débit.
Déposer une ressource en
bibliothèque
Enseignant Publier une fiche, une annale ou un support indépendant d'un
cours, classé par matière, classe, cycle et mots-clés.
E-Académique - Microservice E-learning
Page 5 / 21
Cas d'utilisation Acteur(s) principal(aux) Description sommaire
Rechercher / consulter la
bibliothèque
Enseignant, Apprenant Rechercher et filtrer (matière, type de fichier, enseignant, date)
puis ouvrir une ressource.
Configurer le module Administrateur Activer ou désactiver le module (selon le plan) et définir les
paramètres globaux de l'établissement.
Consulter les statistiques
d'usage
Administrateur, Super
Administrateur
Taux de complétion, moyenne par quiz ou devoir, activité par
classe ; le Super Administrateur ne voit que des données
agrégées.
Fiche détaillée : Publier un cours
Objectif Permettre à un enseignant de mettre à disposition un cours numérique pour ses classes.
Acteur principal Enseignant
Préconditions L'enseignant est affecté à la matière et aux classes visées (rh.affectations).
Le module E-learning est actif pour l'établissement (tenant_id).
Scénario nominal 1. L'enseignant ouvre « Mes cours » puis « Nouveau cours ».
2. Il choisit la matière et la ou les classes cibles (limitées à ses affectations).
3. Il ajoute les blocs de contenu (texte, document, vidéo Cloudinary) et les organise en leçons.
4. Il choisit le statut : brouillon, publication immédiate ou programmée.
5. Le système vérifie les affectations et enregistre le cours et ses leçons.
6. À la publication, les apprenants des classes concernées sont notifiés.
Scénarios alternatifs A1 - Classe non affectée : à l'étape 5, la création est refusée pour cette classe.
A2 - Échec de l'envoi vidéo : le bloc est signalé en erreur et le cours reste en brouillon.
A3 - Publication programmée : le cours reste invisible des apprenants jusqu'à date_publication.
Postconditions Le cours existe avec le statut choisi ; les médias sont référencés (jamais dupliqués) ; la publication
est journalisée dans audit_log.
4.2. Évaluation : devoirs, quiz et report de notes
E-Académique - Microservice E-learning
Page 6 / 21
Figure 2 - Diagramme de cas d'utilisation : devoirs, quiz et report de notes
Cas d'utilisation Acteur(s)
principal(aux)
Description sommaire
Créer un devoir Enseignant Définir l'énoncé, les pièces jointes, la date limite, la note maximale,
la matière, la classe et la politique de retard (blocage ou pénalité).
Déposer un devoir Apprenant Déposer un ou plusieurs fichiers ; le retard éventuel est signalé
automatiquement.
Noter un devoir Enseignant Consulter le fichier déposé, saisir une note et un commentaire.
Créer un quiz Enseignant Composer des QCM, vrai/faux et questions ouvertes (réponse de
référence et barème) ; régler tentatives, chronomètre et restitution.
Passer un quiz Apprenant Répondre au quiz ; correction automatique des QCM ; questions
ouvertes évaluées par le service IA (dépendance externe).
Valider / ajuster la note
proposée par l'IA
Enseignant Confirmer ou modifier la note proposée pour une question ouverte,
puis valider le résultat.
Reporter une note vers le
bulletin
Enseignant Écrire une note validée dans evaluations.notes ; dépend du
microservice Évaluations.
Consulter ses résultats et
corrections
Apprenant, Parent Voir scores, corrections et notes, selon le paramètre de restitution.
E-Académique - Microservice E-learning
Page 7 / 21
Cas d'utilisation Acteur(s)
principal(aux)
Description sommaire
Consulter l'activité e-learning
d'un enfant
Parent Vue en lecture seule : devoirs rendus ou en retard, scores de quiz,
dernières notes.
Fiche détaillée : Passer un quiz avec correction assistée par IA
Objectif Permettre à l'apprenant de réaliser un quiz et d'obtenir un score, avec correction automatique des
QCM et correction assistée par IA des questions ouvertes.
Acteur principal Apprenant (acteurs secondaires : Enseignant pour la validation, service de correction IA)
Préconditions Le quiz est publié pour la classe de l'apprenant.
Le nombre de tentatives autorisées n'est pas épuisé.
Le module E-learning est actif (tenant_id).
Scénario nominal 1. L'apprenant ouvre « Mes quiz » et choisit un quiz disponible.
2. Le système crée une tentative et démarre le chronomètre si le quiz en a un.
3. L'apprenant répond aux questions puis soumet.
4. Le système corrige les QCM et vrai/faux par barème strict.
5. Pour chaque question ouverte, le service de correction compare la réponse à la référence et
propose une note (note_ia).
6. Le score est restitué immédiatement ou de façon différée, selon le paramètre du quiz.
7. L'enseignant est notifié qu'un quiz est en attente de validation.
Scénarios alternatifs A1 - Tentatives épuisées : l'accès au quiz est refusé.
A2 - Temps écoulé : les réponses saisies sont soumises automatiquement.
A3 - Service IA indisponible : les QCM sont notés, les questions ouvertes restent « en attente de
correction » et sont retentées de façon asynchrone ; l'enseignant peut aussi les noter
manuellement.
Postconditions La tentative est enregistrée. Les questions ouvertes portent une note_ia en attente de validation ; la
note officielle n'existe qu'après validation par l'enseignant.
Fiche détaillée : Reporter une note vers le bulletin
Objectif Transférer une note de devoir ou de quiz validée vers le carnet de notes officiel, sans double saisie.
Acteur principal Enseignant
Préconditions La soumission (ou la tentative de quiz) est notée et validée par l'enseignant.
L'enseignant est affecté à la classe et à la matière.
Le module Évaluations est actif pour l'établissement.
Scénario nominal 1. L'enseignant ouvre la soumission ou la tentative validée.
2. Il choisit « Reporter vers le bulletin ».
3. Le système vérifie l'affectation et l'absence de report existant.
4. Le système écrit la note dans evaluations.notes en conservant son origine (devoir ou quiz
e-learning).
5. La soumission passe à « reportée » et l'action est journalisée dans audit_log.
6. L'apprenant et le parent rattaché sont notifiés.
Scénarios alternatifs A1 - Note déjà reportée : le système met à jour la ligne existante (correction journalisée) au lieu
d'en créer une seconde.
A2 - Note non validée : le report est bloqué tant que l'enseignant n'a pas validé la note proposée
par l'IA.
A3 - Module Évaluations inactif : le report est refusé avec un message explicite.
Postconditions La note figure dans evaluations.notes, avec sa traçabilité d'origine ; la soumission référence cette
ligne.
5. Diagrammes de séquence
E-Académique - Microservice E-learning
Page 8 / 21
Deux scénarios illustrent l'interaction du microservice E-learning avec les autres composants. Les lignes de vie
sont colorées par type - violet pour le microservice E-learning, gris pour les services et microservices tiers,
jaune pour les acteurs humains. Les lectures et écritures inter-modules se font par requête directe sur la base
unique, sans copie intermédiaire ni file de réplication ; seuls les événements de notification et la correction IA
volumineuse passent par un traitement asynchrone.
5.1. Passage d'un quiz et correction assistée par IA
Figure 3 - Diagramme de séquence : passage d'un quiz et correction assistée par IA
L'apprenant soumet ses réponses ; la passerelle vérifie le JWT et le statut du tenant avant de transmettre au
microservice E-learning. Celui-ci contrôle la classe, la disponibilité du quiz et le nombre de tentatives restantes,
corrige immédiatement les QCM et vrai/faux, puis transmet chaque réponse ouverte au service de correction -
sans aucune donnée d'identité de l'apprenant - avec la réponse de référence et le barème. La note proposée
E-Académique - Microservice E-learning
Page 9 / 21
est enregistrée dans note_ia. Le score est restitué selon le paramètre du quiz, et l'enseignant, notifié via le
microservice Communication, ajuste et valide la note finale avant qu'elle ne devienne officielle.
5.2. Correction d'un devoir et report vers le bulletin
Figure 4 - Diagramme de séquence : correction d'un devoir et report vers le bulletin
L'enseignant note la soumission ; le système vérifie son affectation à la classe et à la matière par jointure sur
rh.affectations. Lorsqu'il demande le report, le microservice E-learning écrit la note directement dans
evaluations.notes (même base, pas de synchronisation différée), en conservant l'origine « devoir e-learning ». Il
marque alors la soumission comme reportée, journalise l'action et déclenche l'événement qui notifie l'apprenant
et le parent rattaché. Dès cet instant, les autres modules voient la note par simple jointure.
6. Modèle de données - diagrammes entité-association
Le modèle de données du schéma elearning est présenté par domaine. Chaque table possède, en plus de sa
clé primaire interne id, une colonne tenant_id et une colonne uuid, seule exposée dans les API et les URLs,
conformément à la règle transversale de la plateforme. Django accède à ce schéma par un routeur de base de
E-Académique - Microservice E-learning
Page 10 / 21
données dédié.
6.1. Cours et bibliothèque
Figure 5 - Diagramme entité-association : cours et bibliothèque
Table Rôle
cours Cours publié par un enseignant, avec matière, statut (brouillon, publié, archivé) et date de
publication.
cours_classes Table d'association entre un cours et les classes auxquelles il est diffusé.
lecons Unité de contenu ordonnée au sein d'un cours (texte riche, pièce jointe ou vidéo).
medias Référence aux fichiers et vidéos utilisés : url et identifiant Cloudinary pour les vidéos,
chemin de stockage S3/MinIO pour les documents.
ressources_bibliotheque Ressource indépendante d'un cours précis, classée par matière, classe et mots-clés.
parametres_module Paramètres du module propres à un établissement (tentatives multiples par défaut,
restitution par défaut, visibilité pour les parents).
6.2. Devoirs et soumissions
E-Académique - Microservice E-learning
Page 11 / 21
Figure 6 - Diagramme entité-association : devoirs et soumissions
Table Rôle
devoirs Devoir créé par l'enseignant, éventuellement rattaché à un cours, avec date limite, note
maximale et politique de retard.
soumissions Rendu d'un apprenant : date de dépôt, indicateur de retard, note, commentaire ; référence
la ligne evaluations.notes une fois la note reportée.
soumission_fichiers Fichiers déposés pour une soumission (un ou plusieurs), référencés dans medias.
6.3. Quiz, tentatives et corrections
E-Académique - Microservice E-learning
Page 12 / 21
Figure 7 - Diagramme entité-association : quiz, tentatives et corrections
Table Rôle
quiz Quiz créé par l'enseignant : nombre de tentatives, chronométrage, mode de restitution.
questions Question d'un quiz (QCM, vrai/faux ou ouverte), avec réponse de référence et barème pour
les questions ouvertes.
options_question Propositions de réponse d'un QCM, avec indicateur de bonne réponse.
tentatives_quiz Passage d'un apprenant sur un quiz : numéro de tentative, statut, note totale ; référence la
ligne evaluations.notes après report.
reponses_apprenant Réponse à une question et résultat de correction : note proposée par l'IA (note_ia), note
officielle (note_finale) et indicateur de validation par l'enseignant.
Aucune donnée d'identité ou de scolarité n'est dupliquée : les tables ci-dessus référencent par clé étrangère
identite.utilisateurs, scolarite.apprenants, scolarite.classes, evaluations.matieres et rh.personnel, déjà présentes
E-Académique - Microservice E-learning
Page 13 / 21
dans la base unique. Le report de note écrit directement dans evaluations.notes, sans table intermédiaire.
Conformément à la règle transverse de la plateforme, un cours retiré passe au statut « archivé » plutôt que d'être
supprimé.
7. Architecture technique
Le microservice est développé en Django avec Django REST Framework et exposé sous
api-elearning.e-academique.com. Il n'accède qu'aux tables de son propre schéma elearning dans l'instance
PostgreSQL unique de la plateforme, à trois exceptions contrôlées : la lecture des schémas scolarite, rh et
evaluations par jointure SQL directe, et l'écriture dans evaluations.notes pour le report d'une note. Jamais d'appel
HTTP inter-services ni de réplication de données pour ces besoins. Le service reste stateless : la vérité de
session et de statut du tenant est vérifiée par la passerelle API en amont.
Figure 8 - Architecture interne du microservice E-learning
7.1. Composants internes
Le microservice suit une organisation en couches : des ViewSets DRF qui exposent les endpoints (section 8),
des services métier (CoursService, DevoirService, QuizService, BibliothequeService, ReportNoteService,
CorrectionIAService, MediaService) et la couche ORM Django qui isole l'accès aux tables. Les jointures
inter-schémas et l'écriture dans evaluations.notes sont concentrées dans un module d'intégration dédié, afin de
limiter la surface de couplage avec les autres schémas. Il est recommandé que le rôle de base de données utilisé
par Django ne dispose que des droits strictement nécessaires : écriture sur le schéma elearning, lecture des
colonnes utiles des schémas voisins, insertion et mise à jour sur evaluations.notes uniquement.
E-Académique - Microservice E-learning
Page 14 / 21
7.2. Stockage et médias
PostgreSQL, schéma elearning de la base unique, est la source de vérité durable du module. Les vidéos sont
hébergées, transcodées et diffusées par Cloudinary (vignettes générées automatiquement, streaming adaptatif
selon le débit) : aucun serveur de streaming n'est à maintenir côté infrastructure E-Académique. Les documents
non vidéo (PDF, images de cours, fichiers de devoirs) sont déposés dans le stockage objet S3/MinIO commun à
la plateforme, référencés par leur chemin dans la table medias, jamais dupliqués. L'accès aux médias se fait
uniquement par URL signée et temporaire.
7.3. Correction assistée par IA
Un service de correction, interne au microservice ou appelé via l'API d'un modèle de langage externe, évalue les
réponses ouvertes courtes par comparaison sémantique à la réponse de référence, à partir de l'énoncé, de la
référence, du barème et de la seule réponse de l'apprenant. Pour les quiz à fort volume de réponses ouvertes, la
correction est asynchrone, via un worker de tâches (par exemple Celery avec un broker), afin de ne pas bloquer
l'interface. Le choix du mécanisme de tâches asynchrones reste à valider par l'équipe.
7.4. Frontend, hors-ligne et identité visuelle
Aucune interface séparée : les écrans E-learning sont des vues de la Web App / PWA React commune, qui hérite
intégralement du design system de la plateforme (cartes de cours, badges de statut, barres de progression,
lecteur vidéo unique basé sur le SDK web Cloudinary). Les données essentielles (liste des cours, devoirs à
rendre) restent consultables hors connexion grâce au Service Worker de la PWA ; le contenu vidéo lui-même
n'est pas mis en cache. Le module étant entièrement derrière authentification, il n'a aucun enjeu de
référencement naturel (SEO).
8. Endpoints de l'API
Tous les endpoints sont exposés sous le préfixe https://api-elearning.e-academique.com/v1 et ne renvoient, dans
leurs réponses, que les colonnes uuid - jamais les identifiants internes id - conformément à la règle
transversale de la plateforme.
8.1. Cours et médias
Méthode Endpoint Description
POST /cours Crée un cours (enseignant affecté).
GET /cours Liste les cours du tenant, filtrables par matière, classe et statut.
GET /cours/{uuid} Consulte un cours et ses leçons.
PATCH /cours/{uuid} Modifie un cours (titre, statut, date de publication, classes).
POST /cours/{uuid}/archiver Archive un cours (aucune suppression).
POST /cours/{uuid}/lecons Ajoute une leçon (texte, pièce jointe ou vidéo) ; l'ordre est
modifiable.
POST /medias/signature-upload Retourne une signature d'envoi direct vers Cloudinary.
GET /medias/{uuid}/url-signee Retourne une URL signée et temporaire pour un média.
8.2. Devoirs et soumissions
Méthode Endpoint Description
POST /devoirs Crée un devoir.
GET /devoirs Liste les devoirs (à rendre / rendus pour l'apprenant, à corriger
pour l'enseignant).
GET /devoirs/{uuid} Consulte l'énoncé et les pièces jointes.
E-Académique - Microservice E-learning
Page 15 / 21
Méthode Endpoint Description
POST /devoirs/{uuid}/soumissions Dépose une soumission (un ou plusieurs fichiers) ; calcule le
retard.
GET /devoirs/{uuid}/soumissions Liste les soumissions d'un devoir (enseignant).
PATCH /soumissions/{uuid}/note Saisit ou modifie la note et le commentaire (enseignant).
POST /soumissions/{uuid}/reporter Reporte la note validée vers evaluations.notes.
8.3. Quiz et corrections
Méthode Endpoint Description
POST /quiz Crée un quiz.
GET /quiz Liste les quiz disponibles ou créés.
POST /quiz/{uuid}/questions Ajoute une question (QCM, vrai/faux, ouverte) avec options,
référence et barème.
POST /quiz/{uuid}/tentatives Démarre une tentative (vérifie tentatives restantes).
POST /tentatives/{uuid}/soumettre Soumet les réponses ; corrige les QCM et lance la correction
IA des questions ouvertes.
GET /tentatives/{uuid} Consulte le score et les corrections, selon le paramètre de
restitution.
PATCH /reponses/{uuid}/note Ajuste la note proposée par l'IA (enseignant).
POST /tentatives/{uuid}/valider Valide le résultat final d'une tentative (enseignant).
POST /tentatives/{uuid}/reporter Reporte la note validée vers evaluations.notes.
8.4. Bibliothèque, statistiques et paramètres
Méthode Endpoint Description
POST /ressources Dépose une ressource en bibliothèque.
GET /ressources Recherche par matière, classe, cycle, type de fichier,
enseignant, date, mots-clés.
GET /apprenants/{uuid}/activite Activité e-learning d'un apprenant (parent : lecture seule).
GET /statistiques Statistiques d'usage de l'établissement (administrateur).
GET /statistiques/consolidees Statistiques agrégées multi-établissements (Super
Administrateur, sans contenu).
GET / PUT /parametres Consulte ou modifie les paramètres du module de
l'établissement.
9. Règles de gestion
Affectation. Un enseignant ne peut créer ni modifier un cours, un devoir, un quiz ou une ressource que pour les
classes et matières qui lui sont affectées : la vérification est systématique et bloquante, réalisée par jointure
directe sur rh.affectations à chaque écriture, jamais sur une copie.
Module actif. Aucune requête n'est traitée si le module E-learning n'est pas actif pour l'établissement : cette
vérification est effectuée par la passerelle API à chaque appel, en croisant le tenant_id de l'utilisateur avec la
table etablissement_modules, et non une seule fois à la connexion.
E-Académique - Microservice E-learning
Page 16 / 21
Archivage. Un cours retiré passe au statut « archivé » plutôt que d'être supprimé. Un cours en brouillon ou dont
la date de publication n'est pas atteinte reste invisible des apprenants.
Retard et soumissions. Un dépôt postérieur à la date limite est marqué en retard ; selon le paramétrage du
devoir, il est bloqué ou soumis à pénalité. L'historique des soumissions est conservé : une nouvelle soumission
remplace ou s'ajoute à la précédente selon la règle choisie par l'enseignant.
Quiz. Les QCM et vrai/faux sont corrigés par barème strict. Le nombre de tentatives est borné par
tentatives_max, le chronométrage est optionnel, et la restitution du score est immédiate ou différée jusqu'à
validation par l'enseignant.
Rôle de l'IA. La note proposée par l'IA (note_ia) ne devient jamais une note officielle sans validation : l'IA n'a
jamais le dernier mot. Toute modification d'une note par l'enseignant après correction IA est journalisée.
Report de note. Le report vers evaluations.notes est une action explicite de l'enseignant, impossible tant que la
note n'est pas validée. Il ne crée jamais de doublon : une soumission ou une tentative reportée référence la ligne
evaluations.notes, et toute correction ultérieure met à jour cette même ligne, avec journalisation. L'origine de la
note (devoir ou quiz e-learning) est conservée.
Publication vers plusieurs classes. Un cours est diffusé à plusieurs classes par la table cours_classes. Pour
un devoir ou un quiz, la publication vers plusieurs classes crée une ligne par classe en une seule opération, ce
qui garde les jointures simples. Ce choix de modélisation est à valider (voir conclusion).
Apprenants sans compte. Pour une classe de programme béninois, le parent rattaché accède à l'espace
e-learning de son enfant et peut y déposer des devoirs et passer des quiz en son nom ; les données restent
attribuées à l'apprenant et le compte utilisé est tracé dans soumis_par (section 2.6).
Super Administrateur. Il n'accède à aucun contenu pédagogique : seules des statistiques d'usage agrégées lui
sont exposées.
10. Sécurité et conformité
Toute requête entrant par la passerelle API fait l'objet d'une vérification du token JWT (émis par le microservice
Identité) et du statut du tenant avant transmission au microservice ; un établissement suspendu voit toutes ses
requêtes bloquées immédiatement. Le module ne gère aucun mot de passe ni jeton localement.
Chaque table métier porte une colonne tenant_id, filtrée automatiquement par la couche d'accès aux données
Django (cloisonnement de 100 % des requêtes), ainsi qu'une colonne uuid, seule exposée dans les URLs et
réponses, au format https://{service}.e-academique.com/{slug-etablissement}/{ressource}/{uuid-optionnel}. Un
enseignant ne peut jamais publier de contenu pour une classe qui ne lui est pas affectée, ni voir les données d'un
autre établissement.
Les documents et médias ne sont accessibles que par URL signée et temporaire (Cloudinary et S3/MinIO),
jamais par accès direct et permanent. Les types et tailles de fichiers déposés (devoirs, ressources) sont validés
côté serveur, pas seulement côté interface.
Les actions sensibles - publication ou archivage d'un cours, report d'une note vers le bulletin, modification d'une
note par l'enseignant après correction IA - sont journalisées dans audit_log, consultable filtré par tenant.
Les données d'un apprenant mineur - l'immense majorité des profils - restent soumises à un accès restreint
(need-to-know) : les soumissions et résultats ne sont accessibles qu'à l'enseignant affecté, au parent rattaché et
à l'apprenant lui-même. Les échanges avec le service de correction IA ne transmettent aucune donnée d'identité
de l'apprenant, uniquement l'énoncé, la réponse de référence, le barème et la réponse à évaluer.
11. Relations avec les autres microservices
Le microservice E-learning n'est jamais appelé directement par le frontend : toute requête transite par la
passerelle API, qui vérifie la validité du JWT émis par le microservice Identité et le statut du tenant associé. Il
consomme, par jointure directe, les informations des autres modules, et écrit dans un seul schéma extérieur
E-Académique - Microservice E-learning
Page 17 / 21
(evaluations.notes).
Figure 9 - Relations entre le microservice E-learning et le reste de la plateforme
Identité (SSO) fournit le JWT (sub, tenant_id, role) consommé pour authentifier chaque appel ; Établissements
permet de vérifier le statut du module E-learning ; Scolarité fournit les classes, les apprenants, le programme
pédagogique et les liens parent-apprenant ; Évaluations fournit les matières et reçoit les notes reportées ;
Ressources Humaines fournit les affectations enseignant / classe / matière ; Communication est déclenché par
événements applicatifs pour notifier les apprenants, parents et enseignants.
12. Exigences non fonctionnelles
Ce microservice hérite des exigences non fonctionnelles générales du cahier des charges plateforme ; les seuils
ci-dessous en précisent l'application à son périmètre propre.
Exigence Cible / seuil indicatif
Temps de réponse - listes de cours,
devoirs, quiz
Inférieur à 500 ms en conditions normales.
Correction des QCM et vrai/faux Immédiate à la soumission (de l'ordre de la seconde).
Correction IA d'une réponse ouverte Quelques secondes ; traitement asynchrone au-delà d'un seuil de volume, sans
bloquer l'interface.
Streaming vidéo Qualité adaptative gérée par Cloudinary selon le débit ; utilisable en connexion
faible ou intermittente.
Consultation hors connexion Métadonnées (liste des cours, devoirs à rendre) via le cache de la PWA ; vidéos non
mises en cache.
E-Académique - Microservice E-learning
Page 18 / 21
Exigence Cible / seuil indicatif
Disponibilité Au moins 99,5 % en heures ouvrées, conformément au seuil du cahier des charges
plateforme.
Auditabilité 100 % des publications, archivages, reports de note et modifications de note après
correction IA journalisés.
Protection des mineurs Accès aux soumissions et résultats restreint au strict besoin (need-to-know).
Sécurité des fichiers URLs signées et temporaires ; validation serveur des types et tailles.
Intégrité référentielle Contraintes strictes au niveau base de données entre cours, leçons, devoirs,
soumissions, quiz, tentatives et tables externes.
Accessibilité Standards du design system (contrastes, navigation clavier, textes alternatifs).
Sous-titres et transcriptions vidéo non couverts en V1.
13. Structure du projet et déploiement
13.1. Dépôt api-elearning
Le microservice vit dans son propre dépôt Git privé (stratégie « un dépôt par microservice » de la plateforme),
organisé par domaine fonctionnel plutôt que par type technique.
api-elearning/
+-- manage.py
+-- config/ settings, urls, routeur de base (schéma elearning)
+-- apps/
| +-- cours/ cours, leçons, diffusion par classe
| | +-- models.py
| | +-- serializers.py
| | +-- views.py
| | +-- services.py
| +-- devoirs/ devoirs, soumissions, notation
| +-- quiz/ quiz, questions, tentatives
| +-- bibliotheque/
| +-- medias/ Cloudinary, S3/MinIO, URLs signées
| +-- correction_ia/ moteur de correction, tâches asynchrones
| +-- reports/ report vers evaluations.notes
| +-- statistiques/
| +-- parametres/
| +-- integrations/
| | +-- scolarite_reader.py lecture classes, apprenants, programme
| | +-- rh_reader.py vérification des affectations
| | +-- evaluations_writer.py écriture evaluations.notes
| | +-- communication_events.py événements de notification
| +-- common/ permissions, middleware tenant, audit
+-- tests/
| +-- unit/
| +-- api/
| +-- ia/
+-- docker/
+-- .github/workflows/
+-- .env.example
+-- requirements.txt
+-- README.md
13.2. Conventions de nommage
Dépôts et dossiers non Python en minuscules séparés par des tirets (kebab-case) ; packages Python en
snake_case, contrainte imposée par Django (ex. correction_ia) ; tables PostgreSQL en minuscules et en
français, cohérentes avec le reste de la plateforme (cours, lecons, soumissions, tentatives_quiz...) ; variables
d'environnement en MAJUSCULES_AVEC_UNDERSCORE, préfixées par domaine. Branches Git : main
(production, protégée), develop (intégration) et feature/* (ex. feature/correction-ia).
13.3. Tests et validation
E-Académique - Microservice E-learning
Page 19 / 21
• Tests unitaires (pytest-django) sur les règles métier critiques : calcul de retard sur un devoir, barème QCM,
cloisonnement tenant_id, vérification d'affectation enseignant/classe ;
• Tests d'intégration API (client de test DRF) sur les principaux endpoints : création de cours, dépôt de devoir,
soumission de quiz, report de note ;
• Tests de la correction assistée par IA : jeu de réponses de référence avec résultats attendus, pour valider la
cohérence des notes proposées avant mise en production d'une nouvelle version du moteur ;
• Tests de bout en bout sur les parcours utilisateurs clés, exécutés sur le frontend React commun ;
• Recette fonctionnelle avec au moins un enseignant et un apprenant réels, sur un établissement pilote, avant
mise en production.
13.4. Déploiement et CI/CD
Intégration et déploiement continus via GitHub Actions : tests automatiques à chaque pull request, build et
déploiement automatique après fusion sur main. Les variables d'environnement et secrets (clé API Cloudinary,
identifiants de base de données, clé JWT) sont gérés exclusivement via GitHub Environments / Actions Secrets
- jamais commités, jamais transmis par un canal non chiffré. Les migrations Django du schéma elearning sont
appliquées par un pipeline dédié, sans jamais toucher aux autres schémas de la base unique. Le déploiement se
fait sans interruption pour les autres microservices, grâce à l'indépendance de déploiement propre à
l'architecture.
14. Livrables et critères de réception
14.1. Livrables attendus pour ce lot
• Le présent cahier des charges validé ;
• Le modèle de données détaillé du schéma elearning (tables, contraintes, index, colonnes uuid) et ses
migrations ;
• Le backend Django / DRF du microservice, avec documentation d'API (OpenAPI/Swagger) ;
• L'intégration frontend dans la Web App / PWA : espaces enseignant, apprenant, parent et back-office
établissement ;
• La configuration de l'intégration Cloudinary (envoi direct, lecture, gestion des URLs signées) ;
• Le module de correction assistée par IA pour les questions ouvertes, avec son jeu de tests de validation ;
• Le dépôt Git avec pipeline CI/CD GitHub Actions ;
• La documentation technique et utilisateur du module.
14.2. Critères de validation et de réception
Le module pourra être considéré comme fonctionnel et livrable lorsque :
• Un enseignant peut publier un cours avec au moins un contenu texte et une vidéo Cloudinary, visible
immédiatement par les apprenants de la classe ciblée ;
• Un apprenant peut consulter ce cours, y compris en connexion faible, avec adaptation automatique de la
qualité vidéo ;
• Un enseignant peut créer un devoir, un apprenant peut le rendre, et l'enseignant peut le noter et reporter la
note vers le bulletin (evaluations.notes) sans double saisie ;
• Un enseignant peut créer un quiz mêlant QCM et questions ouvertes ; les QCM sont corrigés
automatiquement et les questions ouvertes reçoivent une proposition de note par IA, modifiable avant
validation ;
• Un apprenant en retard sur un devoir est correctement signalé comme tel ;
• Aucun enseignant ni apprenant ne peut accéder à un contenu d'un autre établissement (tenant_id) ni d'une
classe qui ne lui est pas rattachée ;
E-Académique - Microservice E-learning
Page 20 / 21
• Les actions sensibles (publication, archivage, report de note) apparaissent dans le journal d'audit de
l'établissement.
14.3. Maintenance et évolutions
Suivi et mise à jour des dépendances Django / DRF et du SDK Cloudinary ; suivi de la qualité de la correction IA
dans le temps (dérive éventuelle du modèle, réévaluation périodique sur un échantillon de réponses) ;
sauvegardes couvertes par la politique de sauvegarde globale de la base unique. Évolutions envisageables en
V2+ : visioconférence, sous-titrage automatique des vidéos, détection de plagiat, correction manuelle assistée
(annotation), gamification, génération de contenu assistée par IA.
14.4. Postes budgétaires
Budget à compléter selon le contexte de réalisation (ressources internes, prestataire ou développement
individuel). Postes à prévoir : développement backend Django et API ; intégration frontend dans la PWA React ;
compte et forfait Cloudinary (stockage, transcodage, bande passante, coût proportionnel au volume de vidéos et
de vues) ; coût d'appel au service de correction IA (facturé à l'usage s'il est externe) ; temps de recette avec un
établissement pilote.
15. Conclusion
Le microservice E-learning prolonge le parcours de l'apprenant au sein d'E-Académique : de la mise à disposition
des cours au report d'une note dans le carnet officiel, en passant par les devoirs et les quiz corrigés avec l'aide
de l'IA. Sa conception respecte scrupuleusement les principes de la plateforme mère - base de données
unique, cloisonnement par tenant_id, absence de duplication, uuid seuls exposés - tout en assumant deux
choix propres au lot : Django comme exception technologique, et Cloudinary pour la vidéo.
Ce cahier des charges couvre l'ensemble du périmètre nécessaire au développement : règles fonctionnelles,
modèles de données, architecture technique, endpoints API, sécurité et relations avec les autres microservices. Il
reste toutefois trois points à faire valider par l'équipe avant le lancement du développement :
• la structure exacte des tables du schéma elearning, dont plusieurs (cours_classes, soumission_fichiers,
options_question, tentatives_quiz, parametres_module) sont proposées ici par déduction, ainsi que le choix
d'une ligne par classe pour les devoirs et quiz multi-classes ;
• la règle d'accès des apprenants sans compte (programme béninois) : le parent agissant au nom de l'enfant,
en dérogation au principe « parent en lecture seule » ;
• le mécanisme de traitement asynchrone de la correction IA (worker de tâches et broker) et le choix entre
moteur interne ou API externe.
E-Académique - Microservice E-learning
Page 21 / 21