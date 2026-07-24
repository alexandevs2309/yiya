from django.contrib import admin
from .models import Payment, ECFDocument, NCFSequence

admin.site.register(Payment)
admin.site.register(ECFDocument)


@admin.register(NCFSequence)
class NCFSequenceAdmin(admin.ModelAdmin):
    list_display = ['ncf_type', 'prefix', 'current_sequence', 'valid_from', 'valid_to', 'is_active']
    list_editable = ['is_active']
    readonly_fields = ['current_sequence']
