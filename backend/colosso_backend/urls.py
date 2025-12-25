from django.contrib import admin
from django.urls import path, include
from apps.api.views import ventas_export
from apps.api.views_csrf import csrf_view
urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/historial-ventas/export/", ventas_export, name="ventas_export"),
    path('api/csrf/', csrf_view),
    path('api/', include('apps.api.urls')),
]
