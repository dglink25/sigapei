"""Page de documentation automatique de l'API elearningback.

Liste toutes les routes existantes de l'API `/v1/` avec, pour chaque
endpoint : méthode HTTP, chemin, description, paramètres de query,
corps de requête attendu, réponses possibles et permissions requises.

Accessible sur GET /v1/documentation/ (réservé aux administrateurs).
"""

from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class DocumentationAPIView(APIView):
    """Documentation complète et dynamique de l'API elearningback.

    Publique : aucun jeton, aucun en-tête X-Tenant-ID / X-Role requis.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        documentation = {
            'api': 'elearningback',
            'prefixe': '/v1/',
            'description': (
                'API e-learning de SIGAPEI. Toutes les routes exigent '
                'l’en-tête X-Tenant-ID (UUID du tenant/établissement) et '
                'X-Role (enseignant, apprenant, parent, administrateur). '
                'L’authentification est delegatee au microservice Identite '
                '(http://localhost:4001) via le jeton Bearer '
                'Authorization: Bearer <access_token>.'
            ),
            'authentification': {
                'header': 'Authorization: Bearer <access_token>',
                'service_identite': 'http://localhost:4001/v1/moi',
                'tenants': 'X-Tenant-ID (UUID) requis sur toutes les routes /v1/',
                'roles': 'X-Role (enseignant, apprenant, parent, administrateur)',
            },
            'domaines': self._domaines(),
        }
        return Response(documentation)

    # ------------------------------------------------------------------
    # Catalogue des endpoints
    # ------------------------------------------------------------------

    def _domaines(self):
        return [
            {
                'nom': 'Socle commun',
                'slug': 'socle-commun',
                'description': 'Parametres du tenant et documentation.',
                'endpoints': [
                    {
                        'methode': 'GET',
                        'chemin': '/v1/parametres/',
                        'nom': 'parametres',
                        'description': (
                            'Recupere (ou cree si absent) le jeu de '
                            'parametres du tenant courant.'
                        ),
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Tous les roles (lecture) / Administrateur (ecriture)',
                        'reponses': {
                            200: 'ParametresModuleSerializer',
                            403: 'Accès refusé (PUT par non-admin)',
                        },
                    },
                    {
                        'methode': 'PUT',
                        'chemin': '/v1/parametres/',
                        'nom': 'parametres-modifier',
                        'description': (
                            'Met a jour les parametres du tenant courant.'
                        ),
                        'query_params': [],
                        'corps_requis': True,
                        'permissions': 'Administrateur uniquement',
                        'reponses': {
                            200: 'Parametres mis a jour',
                            400: 'Données invalides',
                            403: 'Accès refusé',
                        },
                    },
                    {
                        'methode': 'GET',
                        'chemin': '/documentation/',
                        'nom': 'documentation',
                        'description': 'Cette page de documentation complète.',
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Publique (pas d\'authentification requise)',
                        'reponses': {200: 'Catalogue des endpoints'},
                    },
                ],
            },
            {
                'nom': 'Medias',
                'slug': 'medias',
                'description': (
                    'Gestion des fichiers médias (upload signe, consultation, '
                    'isolation par tenant).'
                ),
                'endpoints': [
                    {
                        'methode': 'GET',
                        'chemin': '/v1/medias/',
                        'nom': 'medias-liste',
                        'description': 'Liste des medias du tenant.',
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Tous les roles',
                        'reponses': {200: 'Liste paginee de MediasSerializer'},
                    },
                    {
                        'methode': 'POST',
                        'chemin': '/v1/medias/',
                        'nom': 'medias-creer',
                        'description': 'Cree une reference media.',
                        'query_params': [],
                        'corps_requis': True,
                        'permissions': 'Tous les roles',
                        'reponses': {201: 'Media cree', 400: 'Données invalides'},
                    },
                    {
                        'methode': 'GET',
                        'chemin': '/v1/medias/{uuid}/',
                        'nom': 'medias-detail',
                        'description': 'Détail d’un media par uuid.',
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Tous les roles',
                        'reponses': {200: 'MediasSerializer', 404: 'Introuvable'},
                    },
                    {
                        'methode': 'PUT',
                        'chemin': '/v1/medias/{uuid}/',
                        'nom': 'medias-modifier',
                        'description': 'Modifie un fichier.',
                        'query_params': [],
                        'corps_requis': True,
                        'permissions': 'Enseignant ou Administrateur',
                        'reponses': {200: 'Media modifie', 403: 'Accès refusé'},
                    },
                    {
                        'methode': 'DELETE',
                        'chemin': '/v1/medias/{uuid}/',
                        'nom': 'medias-supprimer',
                        'description': 'Suppression physique interdite (regle 3).',
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Aucun',
                        'reponses': {405: 'Suppression physique interdite'},
                    },
                    {
                        'methode': 'POST',
                        'chemin': '/v1/medias/signature-upload/',
                        'nom': 'medias-signature-upload',
                        'description': (
                            'Genere une signature d’upload direct Cloudinary. '
                            'Le client n’envoie jamais le fichier au backend.'
                        ),
                        'query_params': [],
                        'corps_requis': True,
                        'corps_exemple': {'dossier': 'elearning'},
                        'permissions': 'Tous les roles',
                        'reponses': {200: 'Signature Cloudinary', 503: 'Service externe non configure'},
                    },
                    {
                        'methode': 'GET',
                        'chemin': '/v1/medias/{uuid}/url-signee/',
                        'nom': 'medias-url-signee',
                        'description': (
                            'Genere une URL temporaire signee S3/MinIO pour '
                            'telecharger le media.'
                        ),
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Tous les roles',
                        'reponses': {200: '{url, expire_dans}', 404: 'Introuvable'},
                    },
                ],
            },
            {
                'nom': 'Cours',
                'slug': 'cours',
                'description': 'CRUD des cours avec lecons imbriquees.',
                'endpoints': [
                    {
                        'methode': 'GET',
                        'chemin': '/v1/cours/',
                        'nom': 'cours-liste',
                        'description': 'Liste des cours du tenant.',
                        'query_params': [
                            {'nom': 'matiere_id', 'type': 'uuid', 'requis': False, 'description': 'Filtrer par matiere'},
                            {'nom': 'classe_id', 'type': 'uuid', 'requis': False, 'description': 'Filtrer par classe'},
                            {'nom': 'statut', 'type': 'texte', 'requis': False, 'description': 'Filtrer par statut (brouillon, publie, archive)'},
                        ],
                        'corps_requis': False,
                        'permissions': 'Tous les roles',
                        'reponses': {200: 'Liste paginee de CoursSerializer'},
                    },
                    {
                        'methode': 'POST',
                        'chemin': '/v1/cours/',
                        'nom': 'cours-creer',
                        'description': 'Cree un cours.',
                        'query_params': [],
                        'corps_requis': True,
                        'permissions': 'Enseignant affecte ou Administrateur',
                        'reponses': {201: 'Cours cree', 400: 'Données invalides', 403: 'Accès refusé'},
                    },
                    {
                        'methode': 'GET',
                        'chemin': '/v1/cours/{uuid}/',
                        'nom': 'cours-detail',
                        'description': 'Détail d’un cours avec ses lecons.',
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Tous les roles',
                        'reponses': {200: 'CoursSerializer', 404: 'Introuvable'},
                    },
                    {
                        'methode': 'PUT',
                        'chemin': '/v1/cours/{uuid}/',
                        'nom': 'cours-modifier',
                        'description': 'Modifie un cours.',
                        'query_params': [],
                        'corps_requis': True,
                        'permissions': 'Enseignant affecte ou Administrateur',
                        'reponses': {200: 'Cours modifie', 403: 'Accès refusé'},
                    },
                    {
                        'methode': 'DELETE',
                        'chemin': '/v1/cours/{uuid}/',
                        'nom': 'cours-supprimer',
                        'description': 'Suppression physique interdite.',
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Aucun',
                        'reponses': {405: 'Suppression physique interdite'},
                    },
                    {
                        'methode': 'POST',
                        'chemin': '/v1/cours/{uuid}/archiver/',
                        'nom': 'cours-archiver',
                        'description': "Passe le cours au statut 'archive'.",
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Enseignant affecte ou Administrateur',
                        'reponses': {200: 'Cours archive'},
                    },
                    {
                        'methode': 'POST',
                        'chemin': '/v1/cours/{uuid}/lecons/',
                        'nom': 'cours-ajouter-lecon',
                        'description': (
                            'Ajoute une lecon au cours, ou reordonne les '
                            'lecons existantes (corps : {"reordonner": [...]})'
                        ),
                        'query_params': [],
                        'corps_requis': True,
                        'corps_exemple': {
                            'titre': 'Ma lecon',
                            'type_contenu': 'texte',
                            'contenu_texte': '...',
                            'ordre': 1,
                        },
                        'permissions': 'Enseignant affecte ou Administrateur',
                        'reponses': {201: 'Lecon cree', 400: 'Données invalides', 403: 'Accès refusé'},
                    },
                ],
            },
            {
                'nom': 'Bibliotheque',
                'slug': 'bibliotheque',
                'description': 'CRUD des ressources de bibliotheque.',
                'endpoints': [
                    {
                        'methode': 'GET',
                        'chemin': '/v1/ressources/',
                        'nom': 'ressources-liste',
                        'description': 'Liste des ressources de bibliotheque.',
                        'query_params': [
                            {'nom': 'matiere_id', 'type': 'uuid', 'requis': False, 'description': 'Filtrer par matiere'},
                            {'nom': 'classe_id', 'type': 'uuid', 'requis': False, 'description': 'Filtrer par classe'},
                            {'nom': 'enseignant_id', 'type': 'uuid', 'requis': False, 'description': 'Filtrer par enseignant'},
                            {'nom': 'mot_cle', 'type': 'texte', 'requis': False, 'description': 'Recherche par mot-cle'},
                        ],
                        'corps_requis': False,
                        'permissions': 'Tous les roles',
                        'reponses': {200: 'Liste paginee de RessourcesBibliothequeSerializer'},
                    },
                    {
                        'methode': 'POST',
                        'chemin': '/v1/ressources/',
                        'nom': 'ressources-creer',
                        'description': 'Cree une ressource de bibliotheque.',
                        'query_params': [],
                        'corps_requis': True,
                        'permissions': 'Enseignant affecte ou Administrateur',
                        'reponses': {201: 'Ressource cree', 400: 'Données invalides', 403: 'Accès refusé'},
                    },
                    {
                        'methode': 'GET',
                        'chemin': '/v1/ressources/{uuid}/',
                        'nom': 'ressources-detail',
                        'description': 'Détail d’une ressource.',
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Tous les roles',
                        'reponses': {200: 'RessourcesBibliothequeSerializer', 404: 'Introuvable'},
                    },
                    {
                        'methode': 'PUT',
                        'chemin': '/v1/ressources/{uuid}/',
                        'nom': 'ressources-modifier',
                        'description': 'Modifie une ressource.',
                        'query_params': [],
                        'corps_requis': True,
                        'permissions': 'Enseignant affecte ou Administrateur',
                        'reponses': {200: 'Ressource modifiee', 403: 'Accès refusé'},
                    },
                    {
                        'methode': 'DELETE',
                        'chemin': '/v1/ressources/{uuid}/',
                        'nom': 'ressources-supprimer',
                        'description': 'Suppression physique interdite.',
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Aucun',
                        'reponses': {405: 'Suppression physique interdite'},
                    },
                ],
            },
            {
                'nom': 'Devoirs',
                'slug': 'devoirs',
                'description': 'CRUD des devoirs, depot de soumissions, correction.',
                'endpoints': [
                    {
                        'methode': 'GET',
                        'chemin': '/v1/devoirs/',
                        'nom': 'devoirs-liste',
                        'description': 'Liste des devoirs du tenant.',
                        'query_params': [
                            {'nom': 'matiere_id', 'type': 'uuid', 'requis': False, 'description': 'Filtrer par matiere'},
                            {'nom': 'classe_id', 'type': 'uuid', 'requis': False, 'description': 'Filtrer par classe'},
                        ],
                        'corps_requis': False,
                        'permissions': 'Tous les roles',
                        'reponses': {200: 'Liste paginee de DevoirSerializer'},
                    },
                    {
                        'methode': 'POST',
                        'chemin': '/v1/devoirs/',
                        'nom': 'devoirs-creer',
                        'description': 'Cree un devoir.',
                        'query_params': [],
                        'corps_requis': True,
                        'permissions': 'Enseignant affecte ou Administrateur',
                        'reponses': {201: 'Devoir cree', 400: 'Données invalides', 403: 'Accès refusé'},
                    },
                    {
                        'methode': 'GET',
                        'chemin': '/v1/devoirs/{uuid}/',
                        'nom': 'devoirs-detail',
                        'description': 'Détail d’un devoir.',
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Tous les roles',
                        'reponses': {200: 'DevoirSerializer', 404: 'Introuvable'},
                    },
                    {
                        'methode': 'PUT',
                        'chemin': '/v1/devoirs/{uuid}/',
                        'nom': 'devoirs-modifier',
                        'description': 'Modifie un devoir.',
                        'query_params': [],
                        'corps_requis': True,
                        'permissions': 'Enseignant affecte ou Administrateur',
                        'reponses': {200: 'Devoir modifie', 403: 'Accès refusé'},
                    },
                    {
                        'methode': 'DELETE',
                        'chemin': '/v1/devoirs/{uuid}/',
                        'nom': 'devoirs-supprimer',
                        'description': 'Suppression physique interdite.',
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Aucun',
                        'reponses': {405: 'Suppression physique interdite'},
                    },
                    {
                        'methode': 'GET',
                        'chemin': '/v1/devoirs/{uuid}/soumissions/',
                        'nom': 'devoirs-soumissions-liste',
                        'description': 'Liste des soumissions d’un devoir (enseignant).',
                        'query_params': [
                            {'nom': 'apprenant_id', 'type': 'uuid', 'requis': False, 'description': 'Filtrer par apprenant'},
                        ],
                        'corps_requis': False,
                        'permissions': 'Enseignant ou Administrateur',
                        'reponses': {200: 'Liste paginee de SoumissionSerializer', 403: 'Accès refusé'},
                    },
                    {
                        'methode': 'POST',
                        'chemin': '/v1/devoirs/{uuid}/soumissions/',
                        'nom': 'devoirs-deposer-soumission',
                        'description': (
                            'Depot d’une soumission (apprenant/parent). '
                            'Le retard est calcule automatiquement.'
                        ),
                        'query_params': [],
                        'corps_requis': True,
                        'permissions': 'Apprenant ou Parent',
                        'reponses': {201: 'Soumission creee', 400: 'Données invalides ou depot bloque', 403: 'Accès refusé'},
                    },
                    {
                        'methode': 'GET',
                        'chemin': '/v1/devoirs/{uuid}/statistiques/',
                        'nom': 'devoirs-statistiques',
                        'description': 'Indicateurs de correction (moyenne, mediane, distribution /20).',
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Enseignant ou Administrateur',
                        'reponses': {200: 'Statistiques du devoir', 403: 'Accès refusé'},
                    },
                ],
            },
            {
                'nom': 'Soumissions',
                'slug': 'soumissions',
                'description': 'Lecture des soumissions, notation et report de note.',
                'endpoints': [
                    {
                        'methode': 'GET',
                        'chemin': '/v1/soumissions/',
                        'nom': 'soumissions-liste',
                        'description': 'Liste des soumissions (apprenant : uniquement les siennes).',
                        'query_params': [
                            {'nom': 'apprenant_id', 'type': 'uuid', 'requis': False, 'description': 'Filtrer par apprenant'},
                        ],
                        'corps_requis': False,
                        'permissions': 'Tous les roles (restriction par proprietaire)',
                        'reponses': {200: 'Liste paginee de SoumissionSerializer'},
                    },
                    {
                        'methode': 'GET',
                        'chemin': '/v1/soumissions/{uuid}/',
                        'nom': 'soumissions-detail',
                        'description': 'Détail d’une soumission.',
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Proprietaire ou Enseignant/Admin',
                        'reponses': {200: 'SoumissionSerializer', 404: 'Introuvable'},
                    },
                    {
                        'methode': 'PATCH',
                        'chemin': '/v1/soumissions/{uuid}/note/',
                        'nom': 'soumissions-noter',
                        'description': "Saisie/annotation de note sur une soumission.",
                        'query_params': [],
                        'corps_requis': True,
                        'corps_exemple': {'note': 14, 'commentaire': 'Bien'},
                        'permissions': 'Enseignant ou Administrateur',
                        'reponses': {200: 'Soumission notee', 400: 'Note requise', 403: 'Accès refusé'},
                    },
                    {
                        'methode': 'POST',
                        'chemin': '/v1/soumissions/{uuid}/reporter/',
                        'nom': 'soumissions-reporter',
                        'description': 'Report de la note vers evaluations.notes.',
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Enseignant ou Administrateur',
                        'reponses': {200: 'Note reportee', 400: 'Note non saisie ou deja reportee', 403: 'Accès refusé', 503: 'Service externe non configure'},
                    },
                ],
            },
            {
                'nom': 'Quiz',
                'slug': 'quiz',
                'description': 'CRUD des quiz, tentatives de quiz, reponses.',
                'endpoints': [
                    {
                        'methode': 'GET',
                        'chemin': '/v1/quiz/',
                        'nom': 'quiz-liste',
                        'description': 'Liste des quiz du tenant.',
                        'query_params': [
                            {'nom': 'matiere_id', 'type': 'uuid', 'requis': False, 'description': 'Filtrer par matiere'},
                            {'nom': 'classe_id', 'type': 'uuid', 'requis': False, 'description': 'Filtrer par classe'},
                            {'nom': 'statut', 'type': 'texte', 'requis': False, 'description': 'Filtrer par statut'},
                        ],
                        'corps_requis': False,
                        'permissions': 'Tous les roles',
                        'reponses': {200: 'Liste paginee de QuizSerializer'},
                    },
                    {
                        'methode': 'POST',
                        'chemin': '/v1/quiz/',
                        'nom': 'quiz-creer',
                        'description': 'Cree un quiz.',
                        'query_params': [],
                        'corps_requis': True,
                        'permissions': 'Enseignant affecte ou Administrateur',
                        'reponses': {201: 'Quiz cree', 400: 'Données invalides', 403: 'Accès refusé'},
                    },
                    {
                        'methode': 'GET',
                        'chemin': '/v1/quiz/{uuid}/',
                        'nom': 'quiz-detail',
                        'description': 'Détail d’un quiz avec questions et options.',
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Tous les roles',
                        'reponses': {200: 'QuizDetailSerializer', 404: 'Introuvable'},
                    },
                    {
                        'methode': 'PUT',
                        'chemin': '/v1/quiz/{uuid}/',
                        'nom': 'quiz-modifier',
                        'description': 'Modifie un quiz.',
                        'query_params': [],
                        'corps_requis': True,
                        'permissions': 'Enseignant affecte ou Administrateur',
                        'reponses': {200: 'Quiz modifie', 403: 'Accès refusé'},
                    },
                    {
                        'methode': 'DELETE',
                        'chemin': '/v1/quiz/{uuid}/',
                        'nom': 'quiz-supprimer',
                        'description': 'Suppression physique interdite.',
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Aucun',
                        'reponses': {405: 'Suppression physique interdite'},
                    },
                    {
                        'methode': 'POST',
                        'chemin': '/v1/quiz/{uuid}/questions/',
                        'nom': 'quiz-ajouter-question',
                        'description': "Ajoute une question avec options et bareme au quiz.",
                        'query_params': [],
                        'corps_requis': True,
                        'permissions': 'Enseignant affecte ou Administrateur',
                        'reponses': {201: 'Question creee', 400: 'Données invalides', 403: 'Accès refusé'},
                    },
                    {
                        'methode': 'POST',
                        'chemin': '/v1/quiz/{uuid}/tentatives/',
                        'nom': 'quiz-demarrer-tentative',
                        'description': (
                            'Demarre une tentative de quiz (apprenant uniquement). '
                            'Verifie tentatives_max, attribue le numero, renvoie les questions.'
                        ),
                        'query_params': [],
                        'corps_requis': True,
                        'corps_exemple': {'apprenant_id': '<uuid>'},
                        'permissions': 'Apprenant uniquement',
                        'reponses': {201: 'Tentative + questions', 400: 'Limite atteinte', 403: 'Accès refusé'},
                    },
                ],
            },
            {
                'nom': 'Tentatives de quiz',
                'slug': 'tentatives',
                'description': 'Soumission, validation et report des tentatives de quiz.',
                'endpoints': [
                    {
                        'methode': 'GET',
                        'chemin': '/v1/tentatives/',
                        'nom': 'tentatives-liste',
                        'description': 'Liste des tentatives (apprenant : uniquement les siennes).',
                        'query_params': [
                            {'nom': 'apprenant_id', 'type': 'uuid', 'requis': False, 'description': 'Filtrer par apprenant'},
                        ],
                        'corps_requis': False,
                        'permissions': 'Tous les roles (restriction par proprietaire)',
                        'reponses': {200: 'Liste paginee de TentativeSerializer'},
                    },
                    {
                        'methode': 'GET',
                        'chemin': '/v1/tentatives/{uuid}/',
                        'nom': 'tentatives-detail',
                        'description': (
                            'Restitution d’une tentatives (selon regle de restitution du quiz).'
                        ),
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Proprietaire ou Enseignant/Admin',
                        'reponses': {200: 'TentativeDetailSerializer', 404: 'Introuvable'},
                    },
                    {
                        'methode': 'POST',
                        'chemin': '/v1/tentatives/{uuid}/soumettre/',
                        'nom': 'tentatives-soumettre',
                        'description': (
                            "Soumet les reponses d’une tentative. "
                            'Corps : {"reponses": [{"question": "<uuid>", "reponse_donnee": "..."}]}'
                        ),
                        'query_params': [],
                        'corps_requis': True,
                        'permissions': 'Apprenant (proprietaire uniquement)',
                        'reponses': {200: 'Tentative soumise', 400: 'Données invalides', 403: 'Accès refusé'},
                    },
                    {
                        'methode': 'POST',
                        'chemin': '/v1/tentatives/{uuid}/valider/',
                        'nom': 'tentatives-valider',
                        'description': "Validation finale par l’enseignant (passe a 'valide').",
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Enseignant ou Administrateur',
                        'reponses': {200: 'Tentative validee', 400: 'Tentative non soumise', 403: 'Accès refusé'},
                    },
                    {
                        'methode': 'POST',
                        'chemin': '/v1/tentatives/{uuid}/reporter/',
                        'nom': 'tentatives-reporter',
                        'description': 'Report de la note totale validee vers evaluations.notes.',
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Enseignant ou Administrateur',
                        'reponses': {200: 'Note reportee', 400: 'Tentative non validee ou deja reportee', 403: 'Accès refusé', 503: 'Service externe non configure'},
                    },
                ],
            },
            {
                'nom': 'Reponses',
                'slug': 'reponses',
                'description': 'Lecture des reponses et ajustement de la note finale.',
                'endpoints': [
                    {
                        'methode': 'GET',
                        'chemin': '/v1/reponses/',
                        'nom': 'reponses-liste',
                        'description': 'Liste des reponses (apprenant : uniquement les siennes).',
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Tous les roles (restriction par proprietaire)',
                        'reponses': {200: 'Liste paginee de ReponseSerializer'},
                    },
                    {
                        'methode': 'GET',
                        'chemin': '/v1/reponses/{uuid}/',
                        'nom': 'reponses-detail',
                        'description': 'Détail d’une reponse.',
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Proprietaire ou Enseignant/Admin',
                        'reponses': {200: 'ReponseSerializer', 404: 'Introuvable'},
                    },
                    {
                        'methode': 'PATCH',
                        'chemin': '/v1/reponses/{uuid}/note/',
                        'nom': 'reponses-noter',
                        'description': "Ajuste/valide note_finale (0 a bareme).",
                        'query_params': [],
                        'corps_requis': True,
                        'corps_exemple': {'note_finale': 12},
                        'permissions': 'Enseignant ou Administrateur',
                        'reponses': {200: 'Reponse notee', 400: 'note_finale requise ou hors bareme', 403: 'Accès refusé'},
                    },
                ],
            },
            {
                'nom': 'Parcours',
                'slug': 'parcours',
                'description': 'CRUD des parcours pedagogiques avec etapes.',
                'endpoints': [
                    {
                        'methode': 'GET',
                        'chemin': '/v1/parcours/',
                        'nom': 'parcours-liste',
                        'description': 'Liste des parcours du tenant.',
                        'query_params': [
                            {'nom': 'matiere_id', 'type': 'uuid', 'requis': False, 'description': 'Filtrer par matiere'},
                            {'nom': 'classe_id', 'type': 'uuid', 'requis': False, 'description': 'Filtrer par classe'},
                            {'nom': 'statut', 'type': 'texte', 'requis': False, 'description': 'Filtrer par statut'},
                        ],
                        'corps_requis': False,
                        'permissions': 'Tous les roles',
                        'reponses': {200: 'Liste paginee de ParcoursSerializer'},
                    },
                    {
                        'methode': 'POST',
                        'chemin': '/v1/parcours/',
                        'nom': 'parcours-creer',
                        'description': 'Cree un parcours.',
                        'query_params': [],
                        'corps_requis': True,
                        'permissions': 'Enseignant affecte ou Administrateur',
                        'reponses': {201: 'Parcours cree', 400: 'Données invalides', 403: 'Accès refusé'},
                    },
                    {
                        'methode': 'GET',
                        'chemin': '/v1/parcours/{uuid}/',
                        'nom': 'parcours-detail',
                        'description': 'Détail d’un parcours avec ses etapes ordonnees.',
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Tous les roles',
                        'reponses': {200: 'ParcoursDetailSerializer', 404: 'Introuvable'},
                    },
                    {
                        'methode': 'PUT',
                        'chemin': '/v1/parcours/{uuid}/',
                        'nom': 'parcours-modifier',
                        'description': 'Modifie un parcours.',
                        'query_params': [],
                        'corps_requis': True,
                        'permissions': 'Enseignant affecte ou Administrateur',
                        'reponses': {200: 'Parcours modifie', 403: 'Accès refusé'},
                    },
                    {
                        'methode': 'DELETE',
                        'chemin': '/v1/parcours/{uuid}/',
                        'nom': 'parcours-supprimer',
                        'description': 'Suppression physique interdite.',
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Aucun',
                        'reponses': {405: 'Suppression physique interdite'},
                    },
                    {
                        'methode': 'POST',
                        'chemin': '/v1/parcours/{uuid}/archiver/',
                        'nom': 'parcours-archiver',
                        'description': "Passe le parcours au statut 'archive'.",
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Enseignant affecte ou Administrateur',
                        'reponses': {200: 'Parcours archive'},
                    },
                    {
                        'methode': 'POST',
                        'chemin': '/v1/parcours/{uuid}/etapes/',
                        'nom': 'parcours-ajouter-etape',
                        'description': (
                            'Ajoute une etape au parcours, ou reordonne '
                            'les etapes existantes.'
                        ),
                        'query_params': [],
                        'corps_requis': True,
                        'permissions': 'Enseignant affecte ou Administrateur',
                        'reponses': {201: 'Etape creee', 400: 'Données invalides', 403: 'Accès refusé'},
                    },
                    {
                        'methode': 'GET',
                        'chemin': '/v1/parcours/{uuid}/progression/',
                        'nom': 'parcours-progression',
                        'description': (
                            'Avancement d’un apprenant dans le parcours '
                            '(etapes terminees, pourcentage).'
                        ),
                        'query_params': [
                            {'nom': 'apprenant_id', 'type': 'uuid', 'requis': True, 'description': 'UUID de l’apprenant'},
                        ],
                        'corps_requis': False,
                        'permissions': 'Tous les roles (restriction par proprietaire)',
                        'reponses': {200: 'Progression de l’apprenant', 400: 'apprenant_id requis'},
                    },
                ],
            },
            {
                'nom': 'Progressions',
                'slug': 'progressions',
                'description': "Suivi d'avancement des apprenants dans les parcours.",
                'endpoints': [
                    {
                        'methode': 'POST',
                        'chemin': '/v1/progressions/',
                        'nom': 'progressions-creer',
                        'description': (
                            'Marque une étape comme terminee pour un apprenant '
                            '(idempotent).'
                        ),
                        'query_params': [],
                        'corps_requis': True,
                        'corps_exemple': {'etape': '<uuid>', 'apprenant_id': '<uuid>', 'soumis_par': '<uuid>'},
                        'permissions': 'Tous les roles',
                        'reponses': {201: 'Progression creee', 400: 'Données invalides', 403: 'Accès refusé'},
                    },
                    {
                        'methode': 'GET',
                        'chemin': '/v1/progressions/',
                        'nom': 'progressions-liste',
                        'description': 'Liste des progressions.',
                        'query_params': [
                            {'nom': 'apprenant_id', 'type': 'uuid', 'requis': False, 'description': 'Filtrer par apprenant'},
                            {'nom': 'parcours', 'type': 'uuid', 'requis': False, 'description': 'Filtrer par parcours'},
                        ],
                        'corps_requis': False,
                        'permissions': 'Tous les roles',
                        'reponses': {200: 'Liste paginee de ProgressionEtapeSerializer'},
                    },
                    {
                        'methode': 'GET',
                        'chemin': '/v1/progressions/{uuid}/',
                        'nom': 'progressions-detail',
                        'description': 'Détail d’une progression.',
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Tous les roles',
                        'reponses': {200: 'ProgressionEtapeSerializer', 404: 'Introuvable'},
                    },
                ],
            },
            {
                'nom': 'Reports (Activite & Statistiques)',
                'slug': 'reports',
                'description': 'Vues transverses en lecture seule.',
                'endpoints': [
                    {
                        'methode': 'GET',
                        'chemin': '/v1/apprenants/{apprenant_uuid}/activite/',
                        'nom': 'apprenants-activite',
                        'description': (
                            'Activite e-learning d’un apprenant '
                            '(soumissions + tentatives quiz).'
                        ),
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Enseignant/Admin ou proprietaire (X-Apprenant-ID)',
                        'reponses': {200: 'Activite de l’apprenant', 403: 'Accès refusé'},
                    },
                    {
                        'methode': 'GET',
                        'chemin': '/v1/statistiques/',
                        'nom': 'statistiques-tenant',
                        'description': 'Indicateurs globaux du tenant (cours, devoirs, quiz).',
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Enseignant ou Administrateur',
                        'reponses': {200: 'Statistiques du tenant', 403: 'Accès refusé'},
                    },
                    {
                        'methode': 'GET',
                        'chemin': '/v1/statistiques/consolidees/',
                        'nom': 'statistiques-consolidees',
                        'description': 'Regroupement des indicateurs par matiere.',
                        'query_params': [],
                        'corps_requis': False,
                        'permissions': 'Enseignant ou Administrateur',
                        'reponses': {200: 'Statistiques par matiere', 403: 'Accès refusé'},
                    },
                ],
            },
        ]
