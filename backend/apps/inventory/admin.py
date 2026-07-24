from django.contrib import admin
from .models import InventoryItem, PurchaseOrder

admin.site.register(InventoryItem)
admin.site.register(PurchaseOrder)
