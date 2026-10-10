"""Routes de l'application Parcours."""
from rest_framework.routers import DefaultRouter

from apps.parcours.views import ParcoursViewSet

router = DefaultRouter()
router.register('parcours', ParcoursViewSet, basename='parcours')

urlpatterns = router.urls
