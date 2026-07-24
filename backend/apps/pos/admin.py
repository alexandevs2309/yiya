from django.contrib import admin
from .models import MenuCategory, MenuItem, ModifierGroup, ModifierOption, Table, Order, OrderItem

admin.site.register(MenuCategory)
admin.site.register(MenuItem)
admin.site.register(ModifierGroup)
admin.site.register(ModifierOption)
admin.site.register(Table)
admin.site.register(Order)
admin.site.register(OrderItem)
