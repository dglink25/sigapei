"""Routes de l'application Quiz."""
from rest_framework.routers import DefaultRouter

from apps.quiz.views import (
    QuizViewSet,
    ReponsesViewSet,
    TentativesViewSet,
)

router = DefaultRouter()
router.register('quiz', QuizViewSet, basename='quiz')
router.register('tentatives', TentativesViewSet, basename='tentatives')
router.register('reponses', ReponsesViewSet, basename='reponses')

urlpatterns = router.urls
