from django.contrib import admin
from .models import ECFDocument


@admin.register(ECFDocument)
class ECFDocumentAdmin(admin.ModelAdmin):
    list_display = ["ecf_number", "order", "ecf_type", "status", "retries", "created_at"]
    list_filter = ["status", "ecf_type"]
