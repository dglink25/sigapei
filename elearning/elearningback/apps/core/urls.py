"""Routes du socle commun."""
from django.urls import path

from apps.core.views import ParametresView

urlpatterns = [
    path('parametres/', ParametresView.as_view(), name='parametres'),
]
