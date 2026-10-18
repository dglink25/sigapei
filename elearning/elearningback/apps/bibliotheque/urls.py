"""Routes de l'application Bibliothèque."""
from rest_framework.routers import DefaultRouter

from apps.bibliotheque.views import RessourcesViewSet

router = DefaultRouter()
router.register('ressources', RessourcesViewSet, basename='ressources')

urlpatterns = router.urls
