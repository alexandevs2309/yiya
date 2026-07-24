from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='docs'),
    path('api/auth/', include('apps.core.urls')),
    path('api/pos/', include('apps.pos.urls')),
    path('api/billing/', include('apps.billing.urls')),
    path('api/inventory/', include('apps.inventory.urls')),
    path('api/printing/', include('apps.printing.urls')),
    path('api/', include('apps.cashregister.urls')),
]

# Servir archivos estáticos/media localmente en producción (Local-First sin Nginx)
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {
        'document_root': settings.MEDIA_ROOT,
    }),
]

from .views import spa_serve
urlpatterns += [
    re_path(r'^(?!api/|admin/|media/|static/|ws/)(?P<path>.*)$', spa_serve, name='spa'),
]
