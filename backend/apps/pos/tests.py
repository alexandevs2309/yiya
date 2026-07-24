from django.test import TestCase
from .models import MenuCategory, MenuItem, Table


class MenuModelTest(TestCase):
    def setUp(self):
        self.cat = MenuCategory.objects.create(name='Entradas', order=1)
        self.item = MenuItem.objects.create(
            name='Tostones',
            category=self.cat,
            price=150.00,
            itbis_type='gravado',
        )

    def test_menu_item_creation(self):
        self.assertEqual(str(self.item), 'Tostones')
        self.assertEqual(self.item.itbis_type, 'gravado')


class TableModelTest(TestCase):
    def test_create_table(self):
        table = Table.objects.create(number='1', section='Interior', capacity=4)
        self.assertEqual(table.status, 'available')
        self.assertEqual(str(table), 'Mesa 1 (Interior)')
