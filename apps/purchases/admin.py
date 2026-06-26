from django.contrib import admin
from .models import Purchase


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ["supplier_name", "supplier_rnc", "date", "ncf", "total", "itbis"]
    list_filter = ["date"]
    search_fields = ["supplier_name", "supplier_rnc", "ncf"]
