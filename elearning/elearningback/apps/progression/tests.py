"""Tests de l'application Progression (marquage + % d'avancement)."""
from decimal import Decimal
from uuid import uuid4

from django.test import TestCase
from rest_framework.test import APIClient

from apps.cours.models import Cours
from apps.parcours.models import EtapesParcours, Parcours
from apps.progression.models import ProgressionEtapes
from apps.quiz.models import Quiz


class ProgressionAPITests(TestCase):
    """POST /v1/progressions/ et GET /v1/parcours/{uuid}/progression/."""

    def setUp(self):
        self.client = APIClient()
        self.tenant = uuid4()
        self.client.credentials(HTTP_X_TENANT_ID=str(self.tenant))
        self.apprenant_id = uuid4()
        self.matiere_id = uuid4()
        self.classe_id = uuid4()
        self.enseignant_id = uuid4()

        self.parcours = Parcours.objects.create(
            titre='Parcours de test', matiere_id=self.matiere_id,
            enseignant_id=self.enseignant_id, tenant_id=self.tenant,
        )
        cours = Cours.objects.create(
            titre='Cours', matiere_id=self.matiere_id,
            enseignant_id=self.enseignant_id, tenant_id=self.tenant,
        )
        quiz = Quiz.objects.create(
            titre='Quiz', matiere_id=self.matiere_id,
            classe_id=self.classe_id, tenant_id=self.tenant,
        )
        self.etape_cours = EtapesParcours.objects.create(
            parcours=self.parcours, ordre=1, cours=cours,
            tenant_id=self.tenant,
        )
        self.etape_quiz = EtapesParcours.objects.create(
            parcours=self.parcours, ordre=2, quiz=quiz,
            tenant_id=self.tenant,
        )

    def marquer(self, client=None, etape=None, apprenant_id=None):
        client = client or self.client
        return client.post(
            '/v1/progressions/',
            {'etape': str((etape or self.etape_cours).uuid),
             'apprenant_id': str(apprenant_id or self.apprenant_id)},
            format='json',
        )

    def test_marquage_idempotent(self):
        reponse = self.marquer()
        self.assertEqual(reponse.status_code, 201)
        self.assertTrue(reponse.data['est_terminee'])

        # Un second marquage met à jour la même ligne (contrainte unique).
        reponse = self.marquer()
        self.assertEqual(reponse.status_code, 201)
        self.assertEqual(
            ProgressionEtapes.objects.filter(
                etape=self.etape_cours, apprenant_id=self.apprenant_id,
            ).count(),
            1,
        )

    def test_pourcentage_avancement(self):
        self.marquer()
        reponse = self.client.get(
            f'/v1/parcours/{self.parcours.uuid}/progression/'
            f'?apprenant_id={self.apprenant_id}',
        )
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.data['nb_etapes'], 2)
        self.assertEqual(reponse.data['nb_terminees'], 1)
        self.assertEqual(
            Decimal(str(reponse.data['pourcentage'])), Decimal('50.00'),
        )
        self.assertEqual(
            [etape['terminee'] for etape in reponse.data['etapes']],
            [True, False],
        )

    def test_parcours_sans_progression(self):
        reponse = self.client.get(
            f'/v1/parcours/{self.parcours.uuid}/progression/'
            f'?apprenant_id={self.apprenant_id}',
        )
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(reponse.data['nb_terminees'], 0)
        self.assertEqual(
            Decimal(str(reponse.data['pourcentage'])), Decimal('0'),
        )

    def test_etape_autre_tenant_refusee(self):
        """L'étape d'un autre établissement ne peut pas être marquée."""
        client_autre = APIClient()
        client_autre.credentials(HTTP_X_TENANT_ID=str(uuid4()))
        reponse = self.marquer(client=client_autre)
        self.assertEqual(reponse.status_code, 400)

    def test_liste_filtree(self):
        ProgressionEtapes.objects.create(
            etape=self.etape_cours, apprenant_id=self.apprenant_id,
            est_terminee=True, tenant_id=self.tenant,
        )
        reponse = self.client.get(
            f'/v1/progressions/?parcours={self.parcours.uuid}',
        )
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(len(reponse.data['results']), 1)

        reponse = self.client.get(
            f'/v1/progressions/?apprenant_id={uuid4()}',
        )
        self.assertEqual(reponse.data['results'], [])

    def test_delete_non_expose(self):
        """Aucune suppression physique : la progression est conservée."""
        reponse = self.client.delete(f'/v1/progressions/{uuid4()}/')
        self.assertEqual(reponse.status_code, 405)
