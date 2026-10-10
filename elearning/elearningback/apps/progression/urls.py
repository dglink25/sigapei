"""Routes de l'application Progression."""
from rest_framework.routers import DefaultRouter

from apps.progression.views import ProgressionsViewSet

router = DefaultRouter()
router.register('progressions', ProgressionsViewSet, basename='progressions')

urlpatterns = router.urls
