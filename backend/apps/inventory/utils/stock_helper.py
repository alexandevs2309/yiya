import logging
from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError
from django.db.models import F
from apps.inventory.models import MenuItemRecipe

logger = logging.getLogger(__name__)

def _log_transaction(item, type_, quantity, reference, notes='', stock_before=None):
    from apps.inventory.models import TransactionLog
    if stock_before is None:
        stock_before = float(item.stock)
    item.refresh_from_db()
    stock_after = float(item.stock)
    TransactionLog.objects.create(
        item=item,
        type=type_,
        quantity=quantity,
        stock_before=stock_before,
        stock_after=stock_after,
        reference=reference,
        notes=notes,
    )


def deduct_order_stock(order):
    """
    Descuenta del inventario los ingredientes requeridos según la receta de cada ítem no cancelado de la orden.
    Valida stock suficiente antes de descontar. Usa F() para evitar colisiones de concurrencia.
    """
    active_items = order.items.exclude(status='cancelled')
    
    for item in active_items:
        if not item.menu_item:
            continue
            
        recipes = MenuItemRecipe.objects.filter(menu_item=item.menu_item)
        if not recipes.exists():
            continue
            
        for recipe in recipes:
            inv_item = recipe.inventory_item
            deduct_qty = recipe.quantity * item.quantity
            
            if inv_item.stock < deduct_qty:
                raise ValidationError(
                    f'Stock insuficiente para "{item.name}": '
                    f'se requieren {deduct_qty} {inv_item.unit} de "{inv_item.name}" '
                    f'pero solo hay {inv_item.stock} {inv_item.unit}.'
                )
            
            logger.info(f"Descontando {deduct_qty} {inv_item.unit} de {inv_item.name} por {item.quantity}x {item.name}")
            
            stock_before = float(inv_item.stock)
            inv_item.stock = F('stock') - deduct_qty
            inv_item.save(update_fields=['stock'])
            inv_item.refresh_from_db()
            
            _log_transaction(
                inv_item, 'sale', -deduct_qty,
                stock_before=stock_before,
                reference=f'Order #{order.id.hex[:8]}',
                notes=f'{item.quantity}x {item.name}',
            )


def restore_order_stock(order):
    """
    Revierte el descuento de inventario al cancelar una orden.
    """
    active_items = order.items.exclude(status='cancelled')

    for item in active_items:
        if not item.menu_item:
            continue

        recipes = MenuItemRecipe.objects.filter(menu_item=item.menu_item)
        if not recipes.exists():
            continue

        for recipe in recipes:
            inv_item = recipe.inventory_item
            restore_qty = recipe.quantity * item.quantity

            logger.info(f"Restaurando {restore_qty} {inv_item.unit} de {inv_item.name} por cancelación de {item.quantity}x {item.name}")

            stock_before = float(inv_item.stock)
            inv_item.stock = F('stock') + restore_qty
            inv_item.save(update_fields=['stock'])
            inv_item.refresh_from_db()

            _log_transaction(
                inv_item, 'return', restore_qty,
                stock_before=stock_before,
                reference=f'Cancel Order #{order.id.hex[:8]}',
                notes=f'Restauración por cancelación de {item.quantity}x {item.name}',
            )
