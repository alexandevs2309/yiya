from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

api_patterns = [
    path("auth/", include("apps.accounts.urls")),
    path("audit/", include("apps.audit.urls")),
    path("menu/", include("apps.menu.urls")),
    path("tables/", include("apps.tables.urls")),
    path("orders/", include("apps.orders.urls")),
    path("billing/", include("apps.billing.urls")),
    path("purchases/", include("apps.purchases.urls")),
    path("cashier/", include("apps.cashier.urls")),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(api_patterns)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
