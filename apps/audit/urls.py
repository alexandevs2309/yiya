from django.urls import path
from .views import AuditLogListView, AuditSummaryView

urlpatterns = [
    path("logs/", AuditLogListView.as_view(), name="audit-logs"),
    path("summary/", AuditSummaryView.as_view(), name="audit-summary"),
]
