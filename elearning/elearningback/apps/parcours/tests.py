"""Tests de l'application Parcours (API /v1/parcours/ + isolation tenant)."""
from uuid import uuid4

from django.test import TestCase
from rest_framework.test import APIClient

from apps.cours.models import Cours
from apps.parcours.models import EtapesParcours, Parcours, ParcoursClasses
from apps.quiz.models import Quiz


class ParcoursAPITests(TestCase):
    """CRUD des parcours, gestion des étapes, cloisonnement tenant."""

    def setUp(self):
        self.client = APIClient()
        self.tenant = uuid4()
        # Toute requête /v1/ exige aussi l'en-tête X-Role (middleware).
        self.client.credentials(
            HTTP_X_TENANT_ID=str(self.tenant), HTTP_X_ROLE='enseignant',
        )
        self.matiere_id = uuid4()
        self.enseignant_id = uuid4()
        self.classe_id = uuid4()

    def creer_parcours(self, tenant_id=None):
        return Parcours.objects.create(
            titre='Parcours de test',
            matiere_id=self.matiere_id,
            enseignant_id=self.enseignant_id,
            tenant_id=tenant_id or self.tenant,
        )

    def creer_cours(self):
        return Cours.objects.create(
            titre='Cours de test',
            matiere_id=self.matiere_id,
            enseignant_id=self.enseignant_id,
            tenant_id=self.tenant,
        )

    def test_en_tete_x_tenant_id_exige(self):
        """Sans X-Tenant-ID, TenantMiddleware refuse (400)."""
        reponse = APIClient().get('/v1/parcours/')
        self.assertEqual(reponse.status_code, 400)
        self.assertIn('X-Tenant-ID', reponse.data['detail'])

    def test_en_tete_x_role_exige(self):
        """Sans X-Role, le middleware refuse la requête (403)."""
        client = APIClient()
        client.credentials(HTTP_X_TENANT_ID=str(self.tenant))
        reponse = client.get('/v1/parcours/')
        self.assertEqual(reponse.status_code, 403)
        self.assertIn('X-Role', reponse.data['detail'])

    def test_apprenant_ne_peut_pas_ecrire(self):
        """Rôle apprenant : lecture autorisée, création refusée."""
        self.client.credentials(
            HTTP_X_TENANT_ID=str(self.tenant), HTTP_X_ROLE='apprenant',
        )
        reponse = self.client.post(
            '/v1/parcours/', {'titre': 'Interdit'}, format='json',
        )
        self.assertEqual(reponse.status_code, 403)
        reponse = self.client.get('/v1/parcours/')
        self.assertEqual(reponse.status_code, 200)

    def test_creation_puis_listing(self):
        donnees = {
            'titre': 'Parcours algèbre',
            'description': 'Séquence de révision',
            'matiere_id': str(self.matiere_id),
            'enseignant_id': str(self.enseignant_id),
            'classes': [str(self.classe_id)],
        }
        reponse = self.client.post('/v1/parcours/', donnees, format='json')
        self.assertEqual(reponse.status_code, 201)
        self.assertTrue(reponse.data['uuid'])
        self.assertEqual(
            reponse.data['classes_liees'], [str(self.classe_id)],
        )

        reponse = self.client.get('/v1/parcours/')
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(len(reponse.data['results']), 1)

    def test_isolation_multi_tenant(self):
        """Les parcours d'un autre établissement sont invisibles."""
        self.creer_parcours(tenant_id=uuid4())
        reponse = self.client.get('/v1/parcours/')
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.data['results'], [])

    def test_filtre_par_classe(self):
        parcours = self.creer_parcours()
        ParcoursClasses.objects.create(
            parcours=parcours, classe_id=self.classe_id,
            tenant_id=self.tenant,
        )
        reponse = self.client.get(
            f'/v1/parcours/?classe_id={self.classe_id}',
        )
        self.assertEqual(len(reponse.data['results']), 1)

        reponse = self.client.get(
            f'/v1/parcours/?classe_id={uuid4()}',
        )
        self.assertEqual(reponse.data['results'], [])

    def test_ajout_etape_ordre_auto(self):
        parcours = self.creer_parcours()
        cours = self.creer_cours()
        reponse = self.client.post(
            f'/v1/parcours/{parcours.uuid}/etapes/',
            {'titre': 'Introduction', 'cours': str(cours.uuid)},
            format='json',
        )
        self.assertEqual(reponse.status_code, 201)
        self.assertEqual(reponse.data['ordre'], 1)
        self.assertEqual(reponse.data['contenu']['type'], 'cours')

    def test_etape_sans_contenu_refusee(self):
        parcours = self.creer_parcours()
        reponse = self.client.post(
            f'/v1/parcours/{parcours.uuid}/etapes/',
            {'titre': 'Vide'},
            format='json',
        )
        self.assertEqual(reponse.status_code, 400)

    def test_etape_deux_contenus_refusee(self):
        parcours = self.creer_parcours()
        cours = self.creer_cours()
        quiz = Quiz.objects.create(
            titre='Quiz de test', matiere_id=self.matiere_id,
            classe_id=self.classe_id, tenant_id=self.tenant,
        )
        reponse = self.client.post(
            f'/v1/parcours/{parcours.uuid}/etapes/',
            {'cours': str(cours.uuid), 'quiz': str(quiz.uuid)},
            format='json',
        )
        self.assertEqual(reponse.status_code, 400)

    def test_reordonnancement(self):
        parcours = self.creer_parcours()
        cours = self.creer_cours()
        etape1 = EtapesParcours.objects.create(
            parcours=parcours, ordre=1, cours=cours, tenant_id=self.tenant,
        )
        etape2 = EtapesParcours.objects.create(
            parcours=parcours, ordre=2, cours=cours, tenant_id=self.tenant,
        )
        reponse = self.client.post(
            f'/v1/parcours/{parcours.uuid}/etapes/',
            {'reordonner': [
                {'uuid': str(etape1.uuid), 'ordre': 2},
                {'uuid': str(etape2.uuid), 'ordre': 1},
            ]},
            format='json',
        )
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(
            [etape['ordre'] for etape in reponse.data], [1, 2],
        )
        self.assertEqual(
            [etape['uuid'] for etape in reponse.data],
            [str(etape2.uuid), str(etape1.uuid)],
        )

    def test_delete_refuse_archiver_autorise(self):
        parcours = self.creer_parcours()
        reponse = self.client.delete(f'/v1/parcours/{parcours.uuid}/')
        self.assertEqual(reponse.status_code, 405)

        reponse = self.client.post(
            f'/v1/parcours/{parcours.uuid}/archiver/',
        )
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.data['statut'], 'archive')

    def test_detail_inclut_les_etapes(self):
        parcours = self.creer_parcours()
        cours = self.creer_cours()
        EtapesParcours.objects.create(
            parcours=parcours, ordre=1, cours=cours, tenant_id=self.tenant,
        )
        reponse = self.client.get(f'/v1/parcours/{parcours.uuid}/')
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.data['nb_etapes'], 1)
        self.assertEqual(len(reponse.data['etapes']), 1)
