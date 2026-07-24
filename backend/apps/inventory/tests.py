from django.test import TestCase
from .models import InventoryItem


class InventoryModelTest(TestCase):
    def test_low_stock(self):
        item = InventoryItem.objects.create(
            name='Aceite', stock=2, min_stock=5, cost_per_unit=100
        )
        self.assertTrue(item.is_low)
        self.assertEqual(item.total_value, 200)
