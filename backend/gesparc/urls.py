from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("overview/", views.overview, name="overview"),
    path("vehicles/", views.vehicle_list, name="vehicle-list"),
    path("vehicles/stats/", views.vehicle_stats, name="vehicle-stats"),
    path("vehicles/<str:num_veh>/", views.vehicle_detail, name="vehicle-detail"),
    path("visites-techniques/", views.visite_technique_list, name="visite-list"),
    path(
        "visites-techniques/stats/",
        views.visite_technique_stats,
        name="visite-stats",
    ),
    path("reformes/", views.reforme_list, name="reforme-list"),
    path("reformes/stats/", views.reforme_stats, name="reforme-stats"),
    path("demandes/", views.demande_list, name="demande-list"),
    path("demandes/stats/", views.demande_stats, name="demande-stats"),
    path("bons-travail/", views.bon_travail_list, name="bt-list"),
    path("bons-travail/stats/", views.bon_travail_stats, name="bt-stats"),
    # detail last: stats path above must win over the greedy <path:reference>
    path("bons-travail/<path:reference>/", views.bon_travail_detail, name="bt-detail"),
    path("bons-commande/", views.bon_commande_list, name="bc-list"),
    path("bons-commande/stats/", views.bon_commande_stats, name="bc-stats"),
    path("bons-commande/<path:reference>/", views.bon_commande_detail, name="bc-detail"),
    path("lookups/<str:name>/", views.lookups, name="lookups"),
]
