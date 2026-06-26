from django.contrib import admin
from .models import CashRegister


@admin.register(CashRegister)
class CashRegisterAdmin(admin.ModelAdmin):
    list_display = ["id_short", "opened_at", "closed_at", "status", "initial_amount", "expected_cash", "difference"]
    list_filter = ["status"]
