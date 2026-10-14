"""Vues de l'application Médias."""
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.mixins import TenantViewSetMixin
from apps.core.permissions import EstEnseignantOuAdmin, RolePermission
from apps.core.services import ServiceExterneNonConfigure
from apps.medias.models import Medias
from apps.medias.serializers import MediasSerializer
from apps.medias.services import (
    generer_signature_upload_cloudinary,
    generer_url_signee_s3,
)


class MediasViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    """CRUD des médias (exposition par `uuid`, isolation par tenant).

    Consultation et référencement ouverts à tous les rôles — l'apprenant
    doit créer/joindre un média pour déposer sa copie — mais la
    modification d'une fiche appartient aux enseignants et
    administrateurs, et aucune suppression physique n'est permise.
    """
    queryset = Medias.objects.all()
    serializer_class = MediasSerializer
    lookup_field = 'uuid'
    permission_classes = [RolePermission]

    def get_permissions(self):
        """Modification de fiche : enseignants et administrateurs."""
        if self.action in ('update', 'partial_update'):
            return [EstEnseignantOuAdmin()]
        return super().get_permissions()

    def destroy(self, request, *args, **kwargs):
        """Règle 3 : un média est une référence partagée, jamais
        supprimée physiquement."""
        return Response(
            {'detail': 'Suppression physique interdite.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    @action(detail=False, methods=['post'], url_path='signature-upload')
    def signature_upload(self, request):
        """POST /v1/medias/signature-upload/ : signature d'upload direct
        Cloudinary. Le client n'envoie jamais son fichier au backend."""
        dossier = request.data.get('dossier', 'elearning')
        try:
            signature = generer_signature_upload_cloudinary(dossier=dossier)
        except ServiceExterneNonConfigure as erreur:
            return Response(
                {'detail': str(erreur)}, status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(signature, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='url-signee')
    def url_signee(self, request, uuid=None):
        """GET /v1/medias/{uuid}/url-signee/ : URL temporaire signée
        S3/MinIO pour télécharger le média."""
        media = self.get_object()
        try:
            url = generer_url_signee_s3(media)
        except ServiceExterneNonConfigure as erreur:
            return Response(
                {'detail': str(erreur)}, status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({'url': url, 'expire_dans': 3600})
