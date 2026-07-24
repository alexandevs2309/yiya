import random
from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from django.db import transaction
from datetime import date, timedelta
from apps.core.models import User, Customer
from apps.pos.models import MenuCategory, MenuItem, Table
from apps.billing.models import NCFSequence
from apps.inventory.models import InventoryItem, MenuItemRecipe


USERS = [
    {'username': 'admin', 'password': 'admin123', 'role': 'admin', 'first_name': 'Admin', 'last_name': 'Principal', 'pin': '9999', 'email': 'admin@dyiya.do'},
    {'username': 'cajero', 'password': 'cajero123', 'role': 'cashier', 'first_name': 'María', 'last_name': 'Cajera', 'email': 'cajero@dyiya.do'},
    {'username': 'mesero1', 'password': 'mesero123', 'role': 'waiter', 'first_name': 'Carlos', 'last_name': 'Mesero', 'pin': '1234', 'email': 'mesero1@dyiya.do'},
    {'username': 'mesero2', 'password': 'mesero123', 'role': 'waiter', 'first_name': 'Ana', 'last_name': 'Mesera', 'pin': '5678', 'email': 'mesero2@dyiya.do'},
    {'username': 'cocinero', 'password': 'cocinero123', 'role': 'cook', 'first_name': 'José', 'last_name': 'Cocina', 'email': 'cocinero@dyiya.do'},
]

CUSTOMERS = [
    {'rnc': '101234567', 'business_name': 'Juan Pérez', 'commercial_name': 'Juan Pérez', 'phone': '809-234-5678', 'email': 'jperez@gmail.com', 'address': 'Calle Principal #45, Santo Domingo'},
    {'rnc': '102345678', 'business_name': 'María Rodríguez', 'commercial_name': 'María Rodríguez', 'phone': '809-345-6789', 'email': 'mrodriguez@hotmail.com', 'address': 'Av. Independencia #123, Santo Domingo'},
    {'rnc': '103456789', 'business_name': 'Carlos Gómez', 'commercial_name': 'Carlos Gómez', 'phone': '829-456-7890', 'email': 'cgomez@yahoo.com', 'address': 'Calle El Conde #67, Zona Colonial'},
    {'rnc': '104567890', 'business_name': 'Ana Martínez', 'commercial_name': 'Ana Martínez', 'phone': '849-567-8901', 'email': 'amartinez@gmail.com', 'address': 'Av. Abraham Lincoln #234, Santo Domingo'},
    {'rnc': '105678901', 'business_name': 'Restaurante La Cava SRL', 'commercial_name': 'La Cava', 'phone': '809-678-9012', 'email': 'info@lacava.do', 'address': 'Av. Winston Churchill #89, Santo Domingo'},
    {'rnc': '106789012', 'business_name': 'Hotel Costa del Sol SRL', 'commercial_name': 'Costa del Sol', 'phone': '809-789-0123', 'email': 'reservas@costadelso.do', 'address': 'Calle El Sol #12, Boca Chica'},
    {'rnc': '107890123', 'business_name': 'Pedro Sánchez', 'commercial_name': 'Pedro Sánchez', 'phone': '829-890-1234', 'email': 'psanchez@outlook.com', 'address': 'Calle Duarte #56, Santiago'},
    {'rnc': '108901234', 'business_name': 'Eventos del Caribe SRL', 'commercial_name': 'Eventos del Caribe', 'phone': '809-901-2345', 'email': 'eventos@caribe.do', 'address': 'Av. 27 de Febrero #345, Santo Domingo'},
    {'rnc': '109012345', 'business_name': 'Laura Fernández', 'commercial_name': 'Laura Fernández', 'phone': '849-012-3456', 'email': 'lfernandez@gmail.com', 'address': 'Calle Las Flores #78, San Cristóbal'},
    {'rnc': '110123456', 'business_name': 'Compañía Turística La Romana SRL', 'commercial_name': 'Turismo La Romana', 'phone': '809-123-4567', 'email': 'info@laromana.do', 'address': 'Av. Santa Fe #90, La Romana'},
]

INVENTORY_ITEMS = [
    # Carnes y Pescados
    {'name': 'Pargo Rojo', 'category': 'Carnes y Pescados', 'unit': 'lb', 'stock': 25, 'min_stock': 10, 'cost_per_unit': 180},
    {'name': 'Chillo', 'category': 'Carnes y Pescados', 'unit': 'lb', 'stock': 15, 'min_stock': 8, 'cost_per_unit': 220},
    {'name': 'Camarones', 'category': 'Carnes y Pescados', 'unit': 'lb', 'stock': 30, 'min_stock': 10, 'cost_per_unit': 280},
    {'name': 'Langosta', 'category': 'Carnes y Pescados', 'unit': 'lb', 'stock': 10, 'min_stock': 5, 'cost_per_unit': 650},
    {'name': 'Pulpo', 'category': 'Carnes y Pescados', 'unit': 'lb', 'stock': 8, 'min_stock': 3, 'cost_per_unit': 350},
    {'name': 'Bacalao', 'category': 'Carnes y Pescados', 'unit': 'lb', 'stock': 12, 'min_stock': 5, 'cost_per_unit': 190},
    {'name': 'Pechuga de Pollo', 'category': 'Carnes y Pescados', 'unit': 'lb', 'stock': 40, 'min_stock': 15, 'cost_per_unit': 95},
    # Verduras y Frutas
    {'name': 'Plátanos Verdes', 'category': 'Verduras y Frutas', 'unit': 'unidad', 'stock': 80, 'min_stock': 30, 'cost_per_unit': 10},
    {'name': 'Yuca', 'category': 'Verduras y Frutas', 'unit': 'lb', 'stock': 30, 'min_stock': 10, 'cost_per_unit': 25},
    {'name': 'Coco', 'category': 'Verduras y Frutas', 'unit': 'unidad', 'stock': 40, 'min_stock': 15, 'cost_per_unit': 35},
    {'name': 'Limones', 'category': 'Verduras y Frutas', 'unit': 'lb', 'stock': 20, 'min_stock': 8, 'cost_per_unit': 40},
    {'name': 'Cebolla', 'category': 'Verduras y Frutas', 'unit': 'lb', 'stock': 25, 'min_stock': 10, 'cost_per_unit': 30},
    {'name': 'Ajíes', 'category': 'Verduras y Frutas', 'unit': 'lb', 'stock': 10, 'min_stock': 5, 'cost_per_unit': 60},
    {'name': 'Ajo', 'category': 'Verduras y Frutas', 'unit': 'lb', 'stock': 8, 'min_stock': 3, 'cost_per_unit': 120},
    {'name': 'Piña', 'category': 'Verduras y Frutas', 'unit': 'unidad', 'stock': 15, 'min_stock': 5, 'cost_per_unit': 50},
    # Lácteos y Huevos
    {'name': 'Leche Evaporada', 'category': 'Lácteos', 'unit': 'lata', 'stock': 48, 'min_stock': 12, 'cost_per_unit': 45},
    {'name': 'Crema de Coco', 'category': 'Lácteos', 'unit': 'lata', 'stock': 30, 'min_stock': 10, 'cost_per_unit': 55},
    {'name': 'Mantequilla', 'category': 'Lácteos', 'unit': 'lb', 'stock': 10, 'min_stock': 4, 'cost_per_unit': 110},
    {'name': 'Queso', 'category': 'Lácteos', 'unit': 'lb', 'stock': 15, 'min_stock': 5, 'cost_per_unit': 140},
    {'name': 'Huevos', 'category': 'Lácteos', 'unit': 'unidad', 'stock': 120, 'min_stock': 30, 'cost_per_unit': 8},
    # Secos y Granos
    {'name': 'Arroz', 'category': 'Secos y Granos', 'unit': 'lb', 'stock': 100, 'min_stock': 25, 'cost_per_unit': 28},
    {'name': 'Habichuelas Rojas', 'category': 'Secos y Granos', 'unit': 'lb', 'stock': 40, 'min_stock': 10, 'cost_per_unit': 35},
    {'name': 'Guandules', 'category': 'Secos y Granos', 'unit': 'lb', 'stock': 25, 'min_stock': 8, 'cost_per_unit': 45},
    {'name': 'Harina de Trigo', 'category': 'Secos y Granos', 'unit': 'lb', 'stock': 20, 'min_stock': 8, 'cost_per_unit': 22},
    # Bebidas
    {'name': 'Presidente (Cerveza)', 'category': 'Bebidas', 'unit': 'unidad', 'stock': 200, 'min_stock': 50, 'cost_per_unit': 55},
    {'name': 'Ron Barceló', 'category': 'Bebidas', 'unit': 'botella', 'stock': 15, 'min_stock': 5, 'cost_per_unit': 450},
    {'name': 'Agua (Botellón)', 'category': 'Bebidas', 'unit': 'unidad', 'stock': 60, 'min_stock': 20, 'cost_per_unit': 20},
    # Aceites y Condimentos
    {'name': 'Aceite Vegetal', 'category': 'Aceites y Condimentos', 'unit': 'galón', 'stock': 8, 'min_stock': 3, 'cost_per_unit': 320},
    {'name': 'Sal', 'category': 'Aceites y Condimentos', 'unit': 'lb', 'stock': 15, 'min_stock': 5, 'cost_per_unit': 12},
    {'name': 'Orégano', 'category': 'Aceites y Condimentos', 'unit': 'lb', 'stock': 3, 'min_stock': 1, 'cost_per_unit': 80},
]

RECIPES = {
    'Ceviche de Camarones': [(3, 0.25), (11, 0.10), (12, 0.05)],
    'Tostones con Mojo': [(7, 1.5), (26, 0.05), (13, 0.03)],
    'Casabe con Pate de Langosta': [(8, 0.5), (3, 0.20), (4, 0.15)],
    'Chillo al Ajillo': [(1, 0.8), (13, 0.04), (14, 0.02), (26, 0.03)],
    'Pescado al Coco': [(1, 0.8), (17, 0.25), (11, 0.05), (26, 0.02)],
    'Camaron Rebosado': [(3, 0.5), (23, 0.2), (26, 0.03)],
    'Langosta Thermidor': [(4, 0.6), (17, 0.15), (18, 0.05)],
    'Moro de Guandules con Coco': [(20, 0.3), (22, 0.1), (17, 0.1), (11, 0.03)],
    'Mangú con Los Tres Golpes': [(7, 1.0), (10, 0.05), (6, 0.1), (25, 1)],
    'Sancocho de Pescado': [(5, 0.3), (6, 0.2), (8, 0.25), (11, 0.1), (12, 0.05)],
    'La Bandera': [(20, 0.25), (21, 0.15), (6, 0.2), (26, 0.03), (11, 0.05)],
    'Flan de Coco': [(16, 1), (17, 0.2), (15, 0.1)],
    'Piña Colada': [(15, 1), (17, 0.1), (25, 1)],
}

SECTIONS = ['Interior', 'Terraza', 'Barra', 'VIP']

TABLES = [
    *[{'number': f'{i}', 'section': 'Interior', 'capacity': 2} for i in range(1, 5)],
    *[{'number': f'{i}', 'section': 'Interior', 'capacity': 4} for i in range(5, 11)],
    *[{'number': f'{i}', 'section': 'Interior', 'capacity': 6} for i in range(11, 13)],
    *[{'number': f'{i}', 'section': 'Terraza', 'capacity': 2} for i in range(13, 16)],
    *[{'number': f'{i}', 'section': 'Terraza', 'capacity': 4} for i in range(16, 20)],
    *[{'number': f'{i}', 'section': 'Barra', 'capacity': 1} for i in range(20, 26)],
    *[{'number': f'{i}', 'section': 'VIP', 'capacity': 8} for i in range(26, 28)],
    {'number': '28', 'section': 'VIP', 'capacity': 12},
]

CATEGORIES_AND_ITEMS = [
    {
        'name': 'Entradas',
        'order': 1,
        'items': [
            {'name': 'Ceviche de Camarones', 'price': 350, 'preparation_time': 10, 'itbis_type': 'gravado'},
            {'name': 'Tostones con Mojo', 'price': 180, 'preparation_time': 8, 'itbis_type': 'gravado'},
            {'name': 'Empanadas de Cangrejo (4 uds)', 'price': 280, 'preparation_time': 12, 'itbis_type': 'gravado'},
            {'name': 'Casabe con Pate de Langosta', 'price': 320, 'preparation_time': 8, 'itbis_type': 'gravado'},
            {'name': 'Sopa de Pescado', 'price': 250, 'preparation_time': 15, 'itbis_type': 'gravado'},
        ],
    },
    {
        'name': 'Pescados',
        'order': 2,
        'items': [
            {'name': 'Pescado Entero Frito (Cichla)', 'price': 650, 'preparation_time': 25, 'itbis_type': 'gravado'},
            {'name': 'Chillo al Ajillo', 'price': 720, 'preparation_time': 20, 'itbis_type': 'gravado'},
            {'name': 'Filete de Pargo a la Plancha', 'price': 580, 'preparation_time': 18, 'itbis_type': 'gravado'},
            {'name': 'Pescado al Coco', 'price': 680, 'preparation_time': 22, 'itbis_type': 'gravado'},
            {'name': 'Bacalao Guisado', 'price': 450, 'preparation_time': 15, 'itbis_type': 'gravado'},
        ],
    },
    {
        'name': 'Mariscos',
        'order': 3,
        'items': [
            {'name': 'Camaron Rebosado (10 uds)', 'price': 420, 'preparation_time': 15, 'itbis_type': 'gravado'},
            {'name': 'Langosta Thermidor', 'price': 1200, 'preparation_time': 30, 'itbis_type': 'gravado'},
            {'name': 'Pulpeta de Camarones', 'price': 380, 'preparation_time': 12, 'itbis_type': 'gravado'},
            {'name': 'Parrillada de Mariscos', 'price': 950, 'preparation_time': 25, 'itbis_type': 'gravado'},
            {'name': 'Conchitas Rellenas (6 uds)', 'price': 350, 'preparation_time': 15, 'itbis_type': 'gravado'},
        ],
    },
    {
        'name': 'Criolla',
        'order': 4,
        'items': [
            {'name': 'Moro de Guandules con Coco', 'price': 200, 'preparation_time': 15, 'itbis_type': 'exento'},
            {'name': 'Mangú con Los Tres Golpes', 'price': 280, 'preparation_time': 12, 'itbis_type': 'gravado'},
            {'name': 'Sancocho de Pescado', 'price': 350, 'preparation_time': 20, 'itbis_type': 'gravado'},
            {'name': 'La Bandera (Arroz, Habichuela, Carne)', 'price': 320, 'preparation_time': 15, 'itbis_type': 'gravado'},
            {'name': 'Yuca Frita con Mojo', 'price': 180, 'preparation_time': 10, 'itbis_type': 'exento'},
        ],
    },
    {
        'name': 'Bebidas',
        'order': 5,
        'items': [
            {'name': 'Presidente (Cerveza)', 'price': 120, 'preparation_time': 2, 'itbis_type': 'gravado'},
            {'name': 'Cuba Libre', 'price': 250, 'preparation_time': 3, 'itbis_type': 'gravado'},
            {'name': 'Piña Colada', 'price': 280, 'preparation_time': 5, 'itbis_type': 'gravado'},
            {'name': 'Jugo de Fruta Natural', 'price': 150, 'preparation_time': 3, 'itbis_type': 'exento'},
            {'name': 'Coco Frío', 'price': 100, 'preparation_time': 1, 'itbis_type': 'exento'},
            {'name': 'Agua (Botella 500ml)', 'price': 60, 'preparation_time': 1, 'itbis_type': 'exento'},
            {'name': 'Soda Nacional', 'price': 50, 'preparation_time': 1, 'itbis_type': 'exento'},
        ],
    },
    {
        'name': 'Postres',
        'order': 6,
        'items': [
            {'name': 'Flan de Coco', 'price': 180, 'preparation_time': 5, 'itbis_type': 'gravado'},
            {'name': 'Tres Leches', 'price': 200, 'preparation_time': 5, 'itbis_type': 'gravado'},
            {'name': 'Dulce de Coco', 'price': 150, 'preparation_time': 3, 'itbis_type': 'gravado'},
            {'name': 'Helado de Frutas Tropicales', 'price': 160, 'preparation_time': 2, 'itbis_type': 'gravado'},
        ],
    },
]


RECIPES = {
    'Ceviche de Camarones': [('Camarones', 0.25), ('Cebolla', 0.10), ('Limones', 0.05)],
    'Tostones con Mojo': [('Plátanos Verdes', 1.5), ('Aceite Vegetal', 0.05), ('Ajo', 0.03)],
    'Casabe con Pate de Langosta': [('Yuca', 0.5), ('Camarones', 0.20), ('Langosta', 0.15)],
    'Chillo al Ajillo': [('Chillo', 0.8), ('Ajo', 0.04), ('Limones', 0.02), ('Aceite Vegetal', 0.03)],
    'Pescado al Coco': [('Pargo Rojo', 0.8), ('Crema de Coco', 0.25), ('Cebolla', 0.05), ('Aceite Vegetal', 0.02)],
    'Camaron Rebosado (10 uds)': [('Camarones', 0.5), ('Harina de Trigo', 0.2), ('Aceite Vegetal', 0.03)],
    'Langosta Thermidor': [('Langosta', 0.6), ('Crema de Coco', 0.15), ('Mantequilla', 0.05)],
    'Moro de Guandules con Coco': [('Arroz', 0.3), ('Guandules', 0.1), ('Crema de Coco', 0.1), ('Cebolla', 0.03)],
    'Mangú con Los Tres Golpes': [('Plátanos Verdes', 1.0), ('Limones', 0.05), ('Bacalao', 0.1), ('Presidente (Cerveza)', 1)],
    'Sancocho de Pescado': [('Pargo Rojo', 0.3), ('Bacalao', 0.2), ('Yuca', 0.25), ('Cebolla', 0.1), ('Ajo', 0.05)],
    'La Bandera (Arroz, Habichuela, Carne)': [('Arroz', 0.25), ('Habichuelas Rojas', 0.15), ('Pechuga de Pollo', 0.2), ('Aceite Vegetal', 0.03), ('Cebolla', 0.05)],
    'Flan de Coco': [('Leche Evaporada', 1), ('Crema de Coco', 0.2), ('Piña', 0.1)],
    'Piña Colada': [('Piña', 1), ('Crema de Coco', 0.1), ('Ron Barceló', 1)],
    'Pescado Entero Frito (Cichla)': [('Pargo Rojo', 0.8), ('Aceite Vegetal', 0.1), ('Sal', 0.02)],
    'Filete de Pargo a la Plancha': [('Pargo Rojo', 0.6), ('Mantequilla', 0.05), ('Limones', 0.03)],
    'Bacalao Guisado': [('Bacalao', 0.5), ('Cebolla', 0.08), ('Ajíes', 0.04)],
    'Pulpeta de Camarones': [('Camarones', 0.3), ('Harina de Trigo', 0.1), ('Huevos', 0.15), ('Ajo', 0.02)],
    'Parrillada de Mariscos': [('Langosta', 0.3), ('Camarones', 0.3), ('Pulpo', 0.25), ('Limones', 0.05)],
    'Conchitas Rellenas (6 uds)': [('Camarones', 0.2), ('Queso', 0.1), ('Harina de Trigo', 0.08)],
    'Yuca Frita con Mojo': [('Yuca', 0.4), ('Aceite Vegetal', 0.04), ('Ajo', 0.02)],
    'Dulce de Coco': [('Coco', 2), ('Leche Evaporada', 0.5)],
    'Tres Leches': [('Leche Evaporada', 0.5), ('Harina de Trigo', 0.2), ('Mantequilla', 0.05)],
}


class Command(BaseCommand):
    help = 'Pobla la base de datos con datos iniciales (usuarios, mesas, menú, clientes, inventario)'

    def handle(self, *args, **options):
        with transaction.atomic():
            self._create_users()
            self._create_customers()
            self._create_tables()
            self._create_menu()
            self._create_inventory()
            self._create_recipes()
            self._create_ncf_sequences()

        self.stdout.write(self.style.SUCCESS('Seed completado exitosamente'))
        self.stdout.write(f'  - {User.objects.count()} usuarios')
        self.stdout.write(f'  - {Customer.objects.count()} clientes')
        self.stdout.write(f'  - {Table.objects.count()} mesas')
        self.stdout.write(f'  - {MenuCategory.objects.count()} categorías')
        self.stdout.write(f'  - {MenuItem.objects.count()} items en el menú')
        self.stdout.write(f'  - {InventoryItem.objects.count()} items en inventario')
        self.stdout.write(f'  - {MenuItemRecipe.objects.count()} recetas')
        self.stdout.write(f'  - {NCFSequence.objects.count()} secuencias NCF')

    def _create_users(self):
        for data in USERS:
            password = data.pop('password')
            role = data.get('role')
            defaults = {**data, 'password': make_password(password)}
            if role == 'admin':
                defaults['is_staff'] = True
                defaults['is_superuser'] = True
                
            User.objects.update_or_create(
                username=data['username'],
                defaults=defaults,
            )
            self.stdout.write(f'  ✓ Usuario: {data["username"]} ({role})')

    def _create_tables(self):
        for data in TABLES:
            Table.objects.update_or_create(
                number=data['number'],
                defaults=data,
            )
        self.stdout.write(f'  ✓ {len(TABLES)} mesas creadas')

    def _create_menu(self):
        for cat_data in CATEGORIES_AND_ITEMS:
            items = cat_data.pop('items')
            category, _ = MenuCategory.objects.update_or_create(
                name=cat_data['name'],
                defaults=cat_data,
            )
            for item_data in items:
                MenuItem.objects.update_or_create(
                    name=item_data['name'],
                    defaults={**item_data, 'category': category},
                )
        self.stdout.write(f'  ✓ {len(CATEGORIES_AND_ITEMS)} categorías con items')

    def _create_customers(self):
        for data in CUSTOMERS:
            Customer.objects.update_or_create(
                rnc=data['rnc'],
                defaults=data,
            )
        self.stdout.write(f'  ✓ {len(CUSTOMERS)} clientes')

    def _create_inventory(self):
        for data in INVENTORY_ITEMS:
            InventoryItem.objects.update_or_create(
                name=data['name'],
                defaults=data,
            )
        self.stdout.write(f'  ✓ {len(INVENTORY_ITEMS)} items de inventario')

    def _create_recipes(self):
        items_by_name = {item.name: item for item in MenuItem.objects.all()}
        inv_by_name = {inv.name: inv for inv in InventoryItem.objects.all()}
        count = 0
        for item_name, ingredients in RECIPES.items():
            menu_item = items_by_name.get(item_name)
            if not menu_item:
                self.stdout.write(f'  ! Item de menú no encontrado: {item_name}')
                continue
            for inv_name, qty in ingredients:
                inv_item = inv_by_name.get(inv_name)
                if not inv_item:
                    self.stdout.write(f'  ! Inventario no encontrado: {inv_name}')
                    continue
                MenuItemRecipe.objects.update_or_create(
                    menu_item=menu_item,
                    inventory_item=inv_item,
                    defaults={'quantity': qty},
                )
                count += 1
        self.stdout.write(f'  ✓ {count} recetas creadas')

    def _create_ncf_sequences(self):
        today = date.today()
        defaults = [
            ('B01', 'A01', today, today + timedelta(days=365)),
            ('B04', 'A01', today, today + timedelta(days=365)),
            ('B14', 'A01', today, today + timedelta(days=365)),
        ]
        for ncf_type, prefix, valid_from, valid_to in defaults:
            NCFSequence.objects.get_or_create(
                ncf_type=ncf_type,
                defaults={'prefix': prefix, 'valid_from': valid_from, 'valid_to': valid_to},
            )
        self.stdout.write(f'  ✓ 3 secuencias NCF (B01, B04, B14)')
