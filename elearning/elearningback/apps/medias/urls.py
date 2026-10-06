"""Routes de l'application Médias."""
from rest_framework.routers import DefaultRouter

from apps.medias.views import MediasViewSet

router = DefaultRouter()
router.register('medias', MediasViewSet, basename='medias')

urlpatterns = router.urls
