"""Routes de l'application Devoirs."""
from rest_framework.routers import DefaultRouter

from apps.devoirs.views import DevoirsViewSet, SoumissionsViewSet

router = DefaultRouter()
router.register('devoirs', DevoirsViewSet, basename='devoirs')
router.register('soumissions', SoumissionsViewSet, basename='soumissions')

urlpatterns = router.urls
