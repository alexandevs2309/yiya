from django.contrib import admin
from .models import Zone, Table


@admin.register(Zone)
class ZoneAdmin(admin.ModelAdmin):
    list_display = ["name", "color", "sort_order", "active"]
    list_editable = ["sort_order", "active"]


@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    list_display = ["number", "zone", "capacity", "status", "opened_at", "active"]
    list_filter = ["status", "zone"]
    list_editable = ["capacity", "active"]
