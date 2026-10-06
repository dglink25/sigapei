"""Routes de l'application Reports."""
from django.urls import path

from apps.reports.views import (
    ApprenantActiviteView,
    StatistiquesConsolideesView,
    StatistiquesView,
)

urlpatterns = [
    path('apprenants/<uuid:apprenant_uuid>/activite/',
         ApprenantActiviteView.as_view(), name='apprenant-activite'),
    path('statistiques/', StatistiquesView.as_view(),
         name='statistiques'),
    path('statistiques/consolidees/', StatistiquesConsolideesView.as_view(),
         name='statistiques-consolidees'),
]
