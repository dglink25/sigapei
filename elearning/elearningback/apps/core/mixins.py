"""Mixins DRF garantissant l'isolation multi-tenant côté lecture/écriture.

- `TenantSerializerMixin` : refuse un `tenant_id` fourni par le client et
  injecte automatiquement celui de la requête à la création.
- `TenantViewSetMixin` : restreint chaque queryset au tenant courant, ce qui
  filtre par la même occasion les listes, détails et actions personnalisées.
"""
class TenantSerializerMixin:
    """À ajouter sur tout sérialiseur d'un modèle héritant de BaseModel."""

    def to_internal_value(self, data):
        donnees = super().to_internal_value(data)
        # Le tenant n'est jamais choisi par le client.
        donnees.pop('tenant_id', None)
        return donnees

    def create(self, validated_data):
        validated_data['tenant_id'] = self.context['request'].tenant_id
        return super().create(validated_data)


class TenantViewSetMixin:
    """À ajouter sur tout viewset exposant un modèle héritant de BaseModel."""

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.filter(tenant_id=self.request.tenant_id)
