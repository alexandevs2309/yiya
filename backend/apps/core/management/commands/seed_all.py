import random
import requests
from io import BytesIO
from datetime import datetime, timedelta, date
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.db import transaction
from django.contrib.auth.hashers import make_password
from django.utils import timezone

from apps.core.models import User, Customer
from apps.pos.models import MenuCategory, MenuItem, Table, Order, OrderItem
from apps.billing.models import NCFSequence, Payment
from apps.inventory.models import InventoryItem, MenuItemRecipe


ITEM_IMAGES = {
    'Ceviche de Camarones': '1504671515809-1a49f67a8b1c',
    'Tostones con Mojo': '1624174508411-78f5c5765e0b',
    'Empanadas de Cangrejo (4 uds)': '1601050690597-df0568f7095c',
    'Casabe con Pate de Langosta': '1606761568479-6cd1bd8b703e',
    'Sopa de Pescado': '1548943487-a2e4e43b4853',
    'Pescado Entero Frito (Cichla)': '1524342833487-f08d3b954bbf',
    'Chillo al Ajillo': '1534604973900-c43ab4c2e0ab',
    'Filete de Pargo a la Plancha': '1519708222218-23ce4f9a9f6a',
    'Pescado al Coco': '1559847844-3d9b1c0f0e3d',
    'Bacalao Guisado': '1559847844-3d9b1c0f0e3d',
    'Camaron Rebosado (10 uds)': '1504671515809-1a49f67a8b1c',
    'Langosta Thermidor': '1523508285443-3c78b2d7b5f0',
    'Pulpeta de Camarones': '1625948555067-8d4a5c3b0a2e',
    'Parrillada de Mariscos': '1559748617-4c7a0c4e4c8d',
    'Conchitas Rellenas (6 uds)': '1559847844-3d9b1c0f0e3d',
    'Moro de Guandules con Coco': '1596797580728-0a2b0b9f4c6e',
    'Mangú con Los Tres Golpes': '1624174508411-78f5c5765e0b',
    'Sancocho de Pescado': '1548943487-a2e4e43b4853',
    'La Bandera (Arroz, Habichuela, Carne)': '1596797580728-0a2b0b9f4c6e',
    'Yuca Frita con Mojo': '1624174508411-78f5c5765e0b',
    'Presidente (Cerveza)': '1586997388131-5b0c2a5b9c7d',
    'Cuba Libre': '1595981267035-6b1b4c0d8e0f',
    'Piña Colada': '1595981267035-6b1b4c0d8e0f',
    'Jugo de Fruta Natural': '1595981267035-6b1b4c0d8e0f',
    'Coco Frío': '1606761568479-6cd1bd8b703e',
    'Agua (Botella 500ml)': '1586997388131-5b0c2a5b9c7d',
    'Soda Nacional': '1586997388131-5b0c2a5b9c7d',
    'Flan de Coco': '1603272474339-3b9b5c0d9f9a',
    'Tres Leches': '1603272474339-3b9b5c0d9f9a',
    'Dulce de Coco': '1603272474339-3b9b5c0d9f9a',
    'Helado de Frutas Tropicales': '1603272474339-3b9b5c0d9f9a',
}


FOODISH_CATEGORY = {
    'Entradas': ['samosa', 'pasta', 'burger', 'pizza'],
    'Pescados': ['rice', 'biryani', 'pizza'],
    'Mariscos': ['rice', 'biryani', 'pasta'],
    'Criolla': ['rice', 'biryani', 'dosa', 'idly'],
    'Bebidas': ['dessert'],
    'Postres': ['dessert'],
}


def download_image(label, category_name=None):
    photo_id = ITEM_IMAGES.get(label)
    if photo_id:
        url = f'https://images.unsplash.com/photo-{photo_id}?auto=format&fit=crop&w=800&q=80'
        try:
            resp = requests.get(url, timeout=10)
            if resp.status_code == 200:
                return ContentFile(resp.content, name=f'{label}.jpg')
        except Exception:
            pass

    cats = FOODISH_CATEGORY.get(category_name, ['samosa'])
    import random
    cat = random.choice(cats)
    try:
        resp = requests.get(f'https://foodish-api.com/api/images/{cat}', timeout=10)
        if resp.status_code == 200:
            img_url = resp.json().get('image', '')
            if img_url:
                img_resp = requests.get(img_url, timeout=10)
                if img_resp.status_code == 200:
                    ext = img_url.rsplit('.', 1)[-1] if '.' in img_url else 'jpg'
                    return ContentFile(img_resp.content, name=f'{label}.{ext}')
    except Exception:
        pass
    return None


class Command(BaseCommand):
    help = 'Pobla TODO el proyecto con datos de prueba completos (menú, imágenes, usuarios, mesas, clientes, inventario, órdenes, pagos)'

    def handle(self, *args, **options):
        with transaction.atomic():
            self._create_users()
            self._create_customers()
            self._create_tables()
            self._create_menu()
            self._create_inventory()
            self._create_recipes()
            self._create_ncf_sequences()
            self._download_images()
            self._create_test_orders()

        self.stdout.write(self.style.SUCCESS('\nSeed completado exitosamente'))
        self.stdout.write(f'  - {User.objects.count()} usuarios')
        self.stdout.write(f'  - {Customer.objects.count()} clientes')
        self.stdout.write(f'  - {Table.objects.count()} mesas')
        self.stdout.write(f'  - {MenuCategory.objects.count()} categorías')
        self.stdout.write(f'  - {MenuItem.objects.count()} items en el menú')
        self.stdout.write(f'  - {InventoryItem.objects.count()} items en inventario')
        self.stdout.write(f'  - {MenuItemRecipe.objects.count()} recetas')
        self.stdout.write(f'  - {NCFSequence.objects.count()} secuencias NCF')
        self.stdout.write(f'  - {Order.objects.count()} órdenes de prueba')
        self.stdout.write(f'  - {Payment.objects.count()} pagos de prueba')

    def _create_users(self):
        users = [
            {'username': 'admin', 'password': 'admin123', 'role': 'admin', 'first_name': 'Admin', 'last_name': 'Principal', 'pin': '9999', 'email': 'admin@dyiya.do'},
            {'username': 'cajero', 'password': 'cajero123', 'role': 'cashier', 'first_name': 'María', 'last_name': 'Cajera', 'email': 'cajero@dyiya.do'},
            {'username': 'mesero1', 'password': 'mesero123', 'role': 'waiter', 'first_name': 'Carlos', 'last_name': 'Martínez', 'pin': '1234', 'email': 'mesero1@dyiya.do'},
            {'username': 'mesero2', 'password': 'mesero123', 'role': 'waiter', 'first_name': 'Ana', 'last_name': 'Rodríguez', 'pin': '5678', 'email': 'mesero2@dyiya.do'},
            {'username': 'mesero3', 'password': 'mesero123', 'role': 'waiter', 'first_name': 'Luis', 'last_name': 'Pérez', 'pin': '4321', 'email': 'mesero3@dyiya.do'},
            {'username': 'cocinero', 'password': 'cocinero123', 'role': 'cook', 'first_name': 'José', 'last_name': 'Cocina', 'email': 'cocinero@dyiya.do'},
        ]
        for data in users:
            pwd = data.pop('password')
            role = data.get('role')
            defaults = {**data, 'password': make_password(pwd)}
            if role == 'admin':
                defaults['is_staff'] = True
                defaults['is_superuser'] = True
            User.objects.update_or_create(username=data['username'], defaults=defaults)
        self.stdout.write('  ✓ Usuarios creados')

    def _create_customers(self):
        customers = [
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
        for data in customers:
            Customer.objects.update_or_create(rnc=data['rnc'], defaults=data)
        self.stdout.write('  ✓ Clientes creados')

    def _create_tables(self):
        tables = [
            *[{'number': str(i), 'section': 'Interior', 'capacity': 2, 'x': 2.0 + (i-1)*1.5, 'y': 5.0} for i in range(1, 5)],
            *[{'number': str(i), 'section': 'Interior', 'capacity': 4, 'x': 2.0 + (i-5)*2.0, 'y': 3.0} for i in range(5, 11)],
            *[{'number': str(i), 'section': 'Interior', 'capacity': 6, 'x': 8.0, 'y': 1.0 + (i-11)*2.5} for i in range(11, 13)],
            *[{'number': str(i), 'section': 'Terraza', 'capacity': 2, 'x': 12.0 + (i-13)*1.5, 'y': 5.0} for i in range(13, 16)],
            *[{'number': str(i), 'section': 'Terraza', 'capacity': 4, 'x': 12.0 + (i-16)*2.0, 'y': 3.0} for i in range(16, 20)],
            *[{'number': str(i), 'section': 'Barra', 'capacity': 1, 'x': 0.5, 'y': 1.0 + (i-20)*1.2} for i in range(20, 26)],
            {'number': '26', 'section': 'VIP', 'capacity': 8, 'x': 6.0, 'y': 6.0},
            {'number': '27', 'section': 'VIP', 'capacity': 8, 'x': 10.0, 'y': 6.0},
            {'number': '28', 'section': 'VIP', 'capacity': 12, 'x': 8.0, 'y': 8.0},
        ]
        for data in tables:
            Table.objects.update_or_create(number=data['number'], defaults=data)
        self.stdout.write('  ✓ Mesas creadas con posiciones en el mapa')

    def _create_menu(self):
        categories = [
            {
                'name': 'Entradas', 'order': 1,
                'items': [
                    {'name': 'Ceviche de Camarones', 'price': 350, 'preparation_time': 10},
                    {'name': 'Tostones con Mojo', 'price': 180, 'preparation_time': 8},
                    {'name': 'Empanadas de Cangrejo (4 uds)', 'price': 280, 'preparation_time': 12},
                    {'name': 'Casabe con Pate de Langosta', 'price': 320, 'preparation_time': 8},
                    {'name': 'Sopa de Pescado', 'price': 250, 'preparation_time': 15},
                ],
            },
            {
                'name': 'Pescados', 'order': 2,
                'items': [
                    {'name': 'Pescado Entero Frito (Cichla)', 'price': 650, 'preparation_time': 25},
                    {'name': 'Chillo al Ajillo', 'price': 720, 'preparation_time': 20},
                    {'name': 'Filete de Pargo a la Plancha', 'price': 580, 'preparation_time': 18},
                    {'name': 'Pescado al Coco', 'price': 680, 'preparation_time': 22},
                    {'name': 'Bacalao Guisado', 'price': 450, 'preparation_time': 15},
                ],
            },
            {
                'name': 'Mariscos', 'order': 3,
                'items': [
                    {'name': 'Camaron Rebosado (10 uds)', 'price': 420, 'preparation_time': 15},
                    {'name': 'Langosta Thermidor', 'price': 1200, 'preparation_time': 30},
                    {'name': 'Pulpeta de Camarones', 'price': 380, 'preparation_time': 12},
                    {'name': 'Parrillada de Mariscos', 'price': 950, 'preparation_time': 25},
                    {'name': 'Conchitas Rellenas (6 uds)', 'price': 350, 'preparation_time': 15},
                ],
            },
            {
                'name': 'Criolla', 'order': 4,
                'items': [
                    {'name': 'Moro de Guandules con Coco', 'price': 200, 'preparation_time': 15},
                    {'name': 'Mangú con Los Tres Golpes', 'price': 280, 'preparation_time': 12},
                    {'name': 'Sancocho de Pescado', 'price': 350, 'preparation_time': 20},
                    {'name': 'La Bandera (Arroz, Habichuela, Carne)', 'price': 320, 'preparation_time': 15},
                    {'name': 'Yuca Frita con Mojo', 'price': 180, 'preparation_time': 10},
                ],
            },
            {
                'name': 'Bebidas', 'order': 5,
                'items': [
                    {'name': 'Presidente (Cerveza)', 'price': 120, 'preparation_time': 2},
                    {'name': 'Cuba Libre', 'price': 250, 'preparation_time': 3},
                    {'name': 'Piña Colada', 'price': 280, 'preparation_time': 5},
                    {'name': 'Jugo de Fruta Natural', 'price': 150, 'preparation_time': 3},
                    {'name': 'Coco Frío', 'price': 100, 'preparation_time': 1},
                    {'name': 'Agua (Botella 500ml)', 'price': 60, 'preparation_time': 1},
                    {'name': 'Soda Nacional', 'price': 50, 'preparation_time': 1},
                ],
            },
            {
                'name': 'Postres', 'order': 6,
                'items': [
                    {'name': 'Flan de Coco', 'price': 180, 'preparation_time': 5},
                    {'name': 'Tres Leches', 'price': 200, 'preparation_time': 5},
                    {'name': 'Dulce de Coco', 'price': 150, 'preparation_time': 3},
                    {'name': 'Helado de Frutas Tropicales', 'price': 160, 'preparation_time': 2},
                ],
            },
        ]
        for cat_data in categories:
            items = cat_data.pop('items')
            category, _ = MenuCategory.objects.update_or_create(name=cat_data['name'], defaults=cat_data)
            for item_data in items:
                extra = {}
                MenuItem.objects.update_or_create(
                    name=item_data['name'],
                    defaults={**item_data, 'category': category, **extra},
                )
        self.stdout.write('  ✓ Menú completo con descripciones')

    def _create_inventory(self):
        items = [
            {'name': 'Pargo Rojo', 'category': 'Carnes y Pescados', 'unit': 'lb', 'stock': 25, 'min_stock': 10, 'cost_per_unit': 180},
            {'name': 'Chillo', 'category': 'Carnes y Pescados', 'unit': 'lb', 'stock': 15, 'min_stock': 8, 'cost_per_unit': 220},
            {'name': 'Camarones', 'category': 'Carnes y Pescados', 'unit': 'lb', 'stock': 30, 'min_stock': 10, 'cost_per_unit': 280},
            {'name': 'Langosta', 'category': 'Carnes y Pescados', 'unit': 'lb', 'stock': 10, 'min_stock': 5, 'cost_per_unit': 650},
            {'name': 'Pulpo', 'category': 'Carnes y Pescados', 'unit': 'lb', 'stock': 8, 'min_stock': 3, 'cost_per_unit': 350},
            {'name': 'Bacalao', 'category': 'Carnes y Pescados', 'unit': 'lb', 'stock': 12, 'min_stock': 5, 'cost_per_unit': 190},
            {'name': 'Pechuga de Pollo', 'category': 'Carnes y Pescados', 'unit': 'lb', 'stock': 40, 'min_stock': 15, 'cost_per_unit': 95},
            {'name': 'Plátanos Verdes', 'category': 'Verduras y Frutas', 'unit': 'unidad', 'stock': 80, 'min_stock': 30, 'cost_per_unit': 10},
            {'name': 'Yuca', 'category': 'Verduras y Frutas', 'unit': 'lb', 'stock': 30, 'min_stock': 10, 'cost_per_unit': 25},
            {'name': 'Coco', 'category': 'Verduras y Frutas', 'unit': 'unidad', 'stock': 40, 'min_stock': 15, 'cost_per_unit': 35},
            {'name': 'Limones', 'category': 'Verduras y Frutas', 'unit': 'lb', 'stock': 20, 'min_stock': 8, 'cost_per_unit': 40},
            {'name': 'Cebolla', 'category': 'Verduras y Frutas', 'unit': 'lb', 'stock': 25, 'min_stock': 10, 'cost_per_unit': 30},
            {'name': 'Ajíes', 'category': 'Verduras y Frutas', 'unit': 'lb', 'stock': 10, 'min_stock': 5, 'cost_per_unit': 60},
            {'name': 'Ajo', 'category': 'Verduras y Frutas', 'unit': 'lb', 'stock': 8, 'min_stock': 3, 'cost_per_unit': 120},
            {'name': 'Piña', 'category': 'Verduras y Frutas', 'unit': 'unidad', 'stock': 15, 'min_stock': 5, 'cost_per_unit': 50},
            {'name': 'Leche Evaporada', 'category': 'Lácteos', 'unit': 'lata', 'stock': 48, 'min_stock': 12, 'cost_per_unit': 45},
            {'name': 'Crema de Coco', 'category': 'Lácteos', 'unit': 'lata', 'stock': 30, 'min_stock': 10, 'cost_per_unit': 55},
            {'name': 'Mantequilla', 'category': 'Lácteos', 'unit': 'lb', 'stock': 10, 'min_stock': 4, 'cost_per_unit': 110},
            {'name': 'Queso', 'category': 'Lácteos', 'unit': 'lb', 'stock': 15, 'min_stock': 5, 'cost_per_unit': 140},
            {'name': 'Huevos', 'category': 'Lácteos', 'unit': 'unidad', 'stock': 120, 'min_stock': 30, 'cost_per_unit': 8},
            {'name': 'Arroz', 'category': 'Secos y Granos', 'unit': 'lb', 'stock': 100, 'min_stock': 25, 'cost_per_unit': 28},
            {'name': 'Habichuelas Rojas', 'category': 'Secos y Granos', 'unit': 'lb', 'stock': 40, 'min_stock': 10, 'cost_per_unit': 35},
            {'name': 'Guandules', 'category': 'Secos y Granos', 'unit': 'lb', 'stock': 25, 'min_stock': 8, 'cost_per_unit': 45},
            {'name': 'Harina de Trigo', 'category': 'Secos y Granos', 'unit': 'lb', 'stock': 20, 'min_stock': 8, 'cost_per_unit': 22},
            {'name': 'Presidente (Cerveza)', 'category': 'Bebidas', 'unit': 'unidad', 'stock': 200, 'min_stock': 50, 'cost_per_unit': 55},
            {'name': 'Ron Barceló', 'category': 'Bebidas', 'unit': 'botella', 'stock': 15, 'min_stock': 5, 'cost_per_unit': 450},
            {'name': 'Agua (Botellón)', 'category': 'Bebidas', 'unit': 'unidad', 'stock': 60, 'min_stock': 20, 'cost_per_unit': 20},
            {'name': 'Aceite Vegetal', 'category': 'Aceites y Condimentos', 'unit': 'galón', 'stock': 8, 'min_stock': 3, 'cost_per_unit': 320},
            {'name': 'Sal', 'category': 'Aceites y Condimentos', 'unit': 'lb', 'stock': 15, 'min_stock': 5, 'cost_per_unit': 12},
            {'name': 'Orégano', 'category': 'Aceites y Condimentos', 'unit': 'lb', 'stock': 3, 'min_stock': 1, 'cost_per_unit': 80},
        ]
        for data in items:
            InventoryItem.objects.update_or_create(name=data['name'], defaults=data)
        self.stdout.write('  ✓ Inventario completo')

    def _create_recipes(self):
        recipes = {
            'Ceviche de Camarones': [('Camarones', 0.25), ('Cebolla', 0.10), ('Limones', 0.05)],
            'Tostones con Mojo': [('Plátanos Verdes', 1.5), ('Aceite Vegetal', 0.05), ('Ajo', 0.03)],
            'Casabe con Pate de Langosta': [('Yuca', 0.5), ('Camarones', 0.20), ('Langosta', 0.15)],
            'Chillo al Ajillo': [('Chillo', 0.8), ('Ajo', 0.04), ('Limones', 0.02), ('Aceite Vegetal', 0.03)],
            'Pescado al Coco': [('Pargo Rojo', 0.8), ('Crema de Coco', 0.25), ('Cebolla', 0.05), ('Aceite Vegetal', 0.02)],
            'Camaron Rebosado (10 uds)': [('Camarones', 0.5), ('Harina de Trigo', 0.2), ('Aceite Vegetal', 0.03)],
            'Langosta Thermidor': [('Langosta', 0.6), ('Crema de Coco', 0.15), ('Mantequilla', 0.05)],
            'Moro de Guandules con Coco': [('Arroz', 0.3), ('Guandules', 0.1), ('Crema de Coco', 0.1), ('Cebolla', 0.03)],
            'Mangú con Los Tres Golpes': [('Plátanos Verdes', 1.0), ('Limones', 0.05), ('Bacalao', 0.1)],
            'Sancocho de Pescado': [('Pargo Rojo', 0.3), ('Bacalao', 0.2), ('Yuca', 0.25), ('Cebolla', 0.1), ('Ajo', 0.05)],
            'La Bandera (Arroz, Habichuela, Carne)': [('Arroz', 0.25), ('Habichuelas Rojas', 0.15), ('Pechuga de Pollo', 0.2), ('Aceite Vegetal', 0.03), ('Cebolla', 0.05)],
            'Flan de Coco': [('Leche Evaporada', 1), ('Crema de Coco', 0.2), ('Huevos', 2)],
            'Piña Colada': [('Piña', 1), ('Crema de Coco', 0.1), ('Ron Barceló', 1)],
            'Pescado Entero Frito (Cichla)': [('Pargo Rojo', 0.8), ('Aceite Vegetal', 0.1), ('Sal', 0.02)],
            'Filete de Pargo a la Plancha': [('Pargo Rojo', 0.6), ('Mantequilla', 0.05), ('Limones', 0.03)],
            'Bacalao Guisado': [('Bacalao', 0.5), ('Cebolla', 0.08), ('Ajíes', 0.04)],
            'Pulpeta de Camarones': [('Camarones', 0.3), ('Harina de Trigo', 0.1), ('Huevos', 2), ('Ajo', 0.02)],
            'Parrillada de Mariscos': [('Langosta', 0.3), ('Camarones', 0.3), ('Pulpo', 0.25), ('Limones', 0.05)],
            'Conchitas Rellenas (6 uds)': [('Camarones', 0.2), ('Queso', 0.1), ('Harina de Trigo', 0.08)],
            'Yuca Frita con Mojo': [('Yuca', 0.4), ('Aceite Vegetal', 0.04), ('Ajo', 0.02)],
            'Dulce de Coco': [('Coco', 2), ('Leche Evaporada', 0.5)],
            'Tres Leches': [('Leche Evaporada', 0.5), ('Harina de Trigo', 0.2), ('Mantequilla', 0.05)],
            'Empanadas de Cangrejo (4 uds)': [('Harina de Trigo', 0.2), ('Camarones', 0.3), ('Huevos', 1)],
            'Sopa de Pescado': [('Pargo Rojo', 0.3), ('Yuca', 0.2), ('Cebolla', 0.05), ('Ajo', 0.02)],
        }
        items_by_name = {item.name: item for item in MenuItem.objects.all()}
        inv_by_name = {inv.name: inv for inv in InventoryItem.objects.all()}
        count = 0
        for item_name, ingredients in recipes.items():
            menu_item = items_by_name.get(item_name)
            if not menu_item:
                continue
            for inv_name, qty in ingredients:
                inv_item = inv_by_name.get(inv_name)
                if not inv_item:
                    continue
                MenuItemRecipe.objects.update_or_create(
                    menu_item=menu_item, inventory_item=inv_item, defaults={'quantity': qty},
                )
                count += 1
        self.stdout.write(f'  ✓ {count} recetas')

    def _create_ncf_sequences(self):
        today = date.today()
        for ncf_type, prefix in [('B01', 'A01'), ('B04', 'A01'), ('B14', 'A01')]:
            NCFSequence.objects.get_or_create(
                ncf_type=ncf_type,
                defaults={'prefix': prefix, 'valid_from': today, 'valid_to': today + timedelta(days=365)},
            )
        self.stdout.write('  ✓ Secuencias NCF')

    def _download_images(self):
        items = MenuItem.objects.filter(image='')
        downloaded = 0
        self.stdout.write('  Descargando imágenes de Unsplash...')
        for item in items:
            label = item.name.lower().replace(' ', '_').replace('(', '').replace(')', '').replace(',', '')
            cat_name = item.category.name if item.category else None
            img = download_image(label, cat_name)
            if img:
                item.image.save(img.name, img, save=True)
                downloaded += 1
                self.stdout.write(f'    ✓ {item.name}')
            else:
                self.stdout.write(f'    ⚠ {item.name} — sin imagen')
        self.stdout.write(f'  {downloaded}/{items.count()} imágenes descargadas')

    def _create_test_orders(self):
        waiters = list(User.objects.filter(role='waiter'))
        cashier = User.objects.filter(role='cashier').first()
        admin = User.objects.filter(role='admin').first()
        tables = list(Table.objects.all())
        menu_items = list(MenuItem.objects.filter(is_available=True))
        customers = list(Customer.objects.all())

        if not all([waiters, admin, tables, menu_items]):
            self.stdout.write('  ⚠ No hay suficientes datos para crear órdenes de prueba')
            return

        today = timezone.now().date()
        methods = ['cash', 'cardnet', 'tpago']

        order_configs = []

        def make_time(day_offset, hour, minute=0):
            d = today - timedelta(days=day_offset)
            return timezone.make_aware(datetime(d.year, d.month, d.day, hour, minute, 0))

        for day_back in range(7):
            num_orders = random.randint(3, 6)
            for _ in range(num_orders):
                table = random.choice(tables)
                waiter = random.choice(waiters)
                hour = random.randint(11, 21)
                minute = random.choice([0, 15, 30, 45])
                open_time = make_time(day_back, hour, minute)
                close_time = open_time + timedelta(hours=random.randint(1, 3), minutes=random.choice([0, 15, 30]))
                num_items = random.randint(1, 5)
                chosen = random.sample(menu_items, min(num_items, len(menu_items)))
                order_configs.append({
                    'table': table,
                    'waiter': waiter,
                    'open_time': open_time,
                    'close_time': close_time,
                    'items': chosen,
                    'customer': random.choice(customers) if random.random() < 0.3 else None,
                    'method': random.choice(methods),
                })

        for cfg in order_configs:
            order = Order.objects.create(
                table=cfg['table'],
                waiter=cfg['waiter'],
                status='paid',
                guests=random.randint(1, 6),
                created_at=cfg['open_time'],
                updated_at=cfg['close_time'],
            )

            subtotal = Decimal('0')
            items_json = []
            for mi in cfg['items']:
                qty = random.randint(1, 3)
                price = mi.effective_price
                items_json.append({
                    'menu_item': mi.name,
                    'quantity': qty,
                    'price': float(price),
                })
                for _ in range(qty):
                    OrderItem.objects.create(
                        order=order, menu_item=mi, name=mi.name,
                        quantity=1, price=price, status='served',
                    )
                subtotal += price * qty

            itbis = (subtotal * Decimal('0.18')).quantize(Decimal('0.01'))
            propina = (subtotal * Decimal('0.10')).quantize(Decimal('0.01'))
            total = subtotal + itbis + propina

            cash_received = None
            change_given = None
            if cfg['method'] == 'cash':
                cash_received = (total / Decimal('10')).quantize(Decimal('0.01')) * Decimal('10')
                if cash_received < total:
                    cash_received += Decimal('10')
                change_given = (cash_received - total).quantize(Decimal('0.01'))

            processed_by = random.choice([cashier, admin, cfg['waiter']])
            Payment.objects.create(
                order=order, method=cfg['method'],
                subtotal=subtotal, itbis=itbis, propina=propina, total=total,
                cash_received=cash_received, change_given=change_given,
                processed_by=processed_by,
                items_json=items_json,
                created_at=cfg['close_time'],
            )

            for i in range(random.randint(1, 2)):
                modifier_item = random.choice(menu_items)
                extra_price = modifier_item.effective_price
                extra_time = cfg['close_time'] + timedelta(minutes=random.randint(10, 45))
                if extra_time < timezone.now():
                    OrderItem.objects.create(
                        order=order, menu_item=modifier_item, name=modifier_item.name,
                        quantity=1, price=extra_price, status='served',
                    )

        self.stdout.write(f'  ✓ {len(order_configs)} órdenes de prueba (últimos 7 días)')
