"""Routes de l'application Cours."""
from rest_framework.routers import DefaultRouter

from apps.cours.views import CoursViewSet

router = DefaultRouter()
router.register('cours', CoursViewSet, basename='cours')

urlpatterns = router.urls
