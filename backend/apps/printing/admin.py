from django.contrib import admin
from .models import PrinterConfig, PrintJob

@admin.register(PrinterConfig)
class PrinterConfigAdmin(admin.ModelAdmin):
    list_display = ['name', 'type', 'connection_type', 'ip_address', 'is_default', 'is_active']

@admin.register(PrintJob)
class PrintJobAdmin(admin.ModelAdmin):
    list_display = ['type', 'status', 'printer', 'copies', 'retry_count', 'created_at']
    list_filter = ['type', 'status']
