"""Vues du socle commun."""
from rest_framework.exceptions import ValidationError
from rest_framework.generics import RetrieveUpdateAPIView

from apps.core.models import ParametresModule
from apps.core.permissions import EstAdministrateur, RolePermission
from apps.core.serializers import ParametresModuleSerializer


class ParametresView(RetrieveUpdateAPIView):
    """/v1/parametres/ - GET/PUT du singleton de paramètres du tenant.

    La première requête crée le jeu de paramètres avec les valeurs par
    défaut du module (get_or_create), les PUT suivants le mettent à jour.
    """
    serializer_class = ParametresModuleSerializer
    http_method_names = ['get', 'put', 'head', 'options']

    def get_permissions(self):
        """La lecture est ouverte à tous les rôles (page Profil) ; le
        paramétrage du tenant (PUT) est réservé à l'administrateur."""
        if self.request.method == 'PUT':
            return [EstAdministrateur()]
        return [RolePermission()]

    def get_object(self):
        tenant_id = getattr(self.request, 'tenant_id', None)
        if not tenant_id:
            # super_admin (ou tout rôle sans tenant) : pas de paramètres
            # spécifiques à un établissement à retourner.
            raise ValidationError(
                'Ce endpoint nécessite un tenant (X-Tenant-ID).',
            )
        parametres, _ = ParametresModule.objects.get_or_create(
            tenant_id=tenant_id,
        )
        return parametres
