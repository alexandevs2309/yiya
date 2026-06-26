from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from apps.accounts.models import User
from apps.tables.models import Zone, Table
from apps.menu.models import Category, MenuItem


class Command(BaseCommand):
    help = "Crea datos de prueba para el POS"

    def handle(self, *args, **options):
        self._seed_users()
        self._seed_zones()
        self._seed_tables()
        self._seed_categories()
        self._seed_menu_items()
        self.stdout.write(self.style.SUCCESS("Datos de prueba creados exitosamente."))

    def _seed_users(self):
        if User.objects.filter(username="admin").exists():
            self.stdout.write("  Usuarios ya existen, saltando...")
            return
        User.objects.create(
            username="admin",
            password=make_password("admin123"),
            first_name="Admin",
            role="admin",
            pin="1234",
            is_staff=True,
            is_superuser=True,
        )
        User.objects.create(
            username="mesera1",
            password=make_password("mesera123"),
            first_name="Ana",
            role="waitress",
            pin="2345",
            session_color="#F97316",
        )
        User.objects.create(
            username="mesera2",
            password=make_password("mesera123"),
            first_name="María",
            role="waitress",
            pin="3456",
            session_color="#10B981",
        )
        User.objects.create(
            username="cocinero",
            password=make_password("cocina123"),
            first_name="Carlos",
            role="cook",
            pin="4567",
            session_color="#0EA5E9",
        )
        self.stdout.write("  ✅ Usuarios creados")

    def _seed_zones(self):
        if Zone.objects.filter(name__in=["Terraza", "Interior"]).exists():
            self.stdout.write("  Zonas ya existen, saltando...")
            return
        Zone.objects.create(name="Terraza", color="#0EA5E9", sort_order=1)
        Zone.objects.create(name="Interior", color="#10B981", sort_order=2)
        Zone.objects.create(name="Barra", color="#F97316", sort_order=3)
        self.stdout.write("  ✅ Zonas creadas")

    def _seed_tables(self):
        if Table.objects.exists():
            self.stdout.write("  Mesas ya existen, saltando...")
            return
        zones = {z.name: z for z in Zone.objects.all()}
        tables_data = [
            (1, "Terraza", 4), (2, "Terraza", 4), (3, "Terraza", 6), (4, "Terraza", 2),
            (5, "Interior", 4), (6, "Interior", 4), (7, "Interior", 6), (8, "Interior", 2),
            (9, "Barra", 1), (10, "Barra", 1),
        ]
        for number, zone_name, capacity in tables_data:
            Table.objects.create(
                number=number,
                zone=zones.get(zone_name),
                capacity=capacity,
            )
        self.stdout.write("  ✅ 10 mesas creadas")

    def _seed_categories(self):
        if Category.objects.exists():
            self.stdout.write("  Categorías ya existen, saltando...")
            return
        cats = [
            ("Pescados", "fish-symbol", 1),
            ("Mariscos", "shrimp", 2),
            ("Parrillada", "beef", 3),
            ("Carnes", "beef", 4),
            ("Aperitivos", "apple", 5),
            ("Sopas", "utensils-crossed", 6),
            ("Ensaladas", "salad", 7),
            ("Bebidas", "wine", 8),
            ("Jugos Naturales", "apple", 9),
            ("Postres", "cake-slice", 10),
        ]
        for name, icon, sort in cats:
            Category.objects.create(name=name, icon=icon, sort_order=sort)
        self.stdout.write("  ✅ Categorías creadas")

    def _seed_menu_items(self):
        if MenuItem.objects.exists():
            self.stdout.write("  Items ya existen, saltando...")
            return
        cats = {c.name: c for c in Category.objects.all()}

        items = [
            ("Pescados", [
                ("Pescado Frito", "Pescado fresco frito con tostones y ensalada", 650),
                ("Mero al Coco", "Mero en salsa de coco con arroz blanco", 780),
                ("Chillo Entero", "Chillo entero frito con tostones", 720),
                ("Bacalao Guisado", "Bacalao guisado con cebolla y pimientos", 550),
            ]),
            ("Mariscos", [
                ("Langosta", "Langosta a la parrilla con mantequilla de ajo", 1200),
                ("Camarones al Ajillo", "Camarones salteados en aceite de oliva y ajo", 680),
                ("Camarones Envueltos", "Camarones empanizados con papas fritas", 620),
                ("Pulpo a la Galega", "Pulpo cocido con pimentón y aceite de oliva", 850),
                ("Ceviche Mixto", "Ceviche de pescado y camarón con limón", 480),
            ]),
            ("Parrillada", [
                ("Parrillada Mixta", "Carne, pollo, costilla y longaniza", 1200),
                ("Parrillada de Pescado", "Pescado entero a la parrilla", 950),
                ("Parrillada de Mariscos", "Langosta, camarones y pulpo a la parrilla", 1500),
            ]),
            ("Carnes", [
                ("Churrasco", "Churrasco argentino con chimichurri", 850),
                ("Costilla BBQ", "Costilla de cerdo bañada en salsa BBQ", 720),
                ("Pollo al Carbon", "Muslo de pollo marinado al carbón", 520),
                ("Lomo Saltado", "Lomo de res salteado con cebolla y tomate", 680),
            ]),
            ("Aperitivos", [
                ("Tostones", "Tostones de plátano verde con ketchup", 180),
                ("Yaniqueques", "Yaniqueques crujientes", 150),
                ("Arepitas", "Arepitas de maíz con queso", 200),
                ("Bolita de Yuca", "Bolitas de yuca rellenas de queso", 220),
            ]),
            ("Sopas", [
                ("Sopa de Pescado", "Sopa de pescado con verduras", 350),
                ("Sancocho", "Sancocho de carne con 7 carnes", 450),
                ("Sopa de Pollo", "Sopa de pollo con fideos", 280),
            ]),
            ("Ensaladas", [
                ("Ensalada Verde", "Lechuga, tomate, cebolla y aguacate", 250),
                ("Ensalada de la Casa", "Mix de vegetales con aderezo especial", 320),
            ]),
            ("Bebidas", [
                ("Coca Cola", "Lata 355ml", 80),
                ("Coca Cola 2L", "Botella 2 litros", 180),
                ("Presidente", "Cerveza Presidente 330ml", 120),
                ("Agua", "Agua embotellada 500ml", 50),
                ("Morir Soñando", "Jugo de naranja con leche evaporada", 150),
            ]),
            ("Jugos Naturales", [
                ("Jugo de Chinola", "Jugo de chinola natural", 120),
                ("Jugo de Tamarindo", "Jugo de tamarindo natural", 120),
                ("Jugo de Piña", "Jugo de piña natural", 100),
                ("Batida de Frutas", "Batida de frutas con leche", 150),
            ]),
            ("Postres", [
                ("Flan", "Flan de caramelo casero", 200),
                ("Helado", "Helado de vainilla o chocolate", 180),
                ("Arroz con Leche", "Arroz con leche canela", 180),
                ("Tres Leches", "Pastel de tres leches", 250),
            ]),
        ]

        for cat_name, item_list in items:
            cat = cats[cat_name]
            for i, (name, desc, price) in enumerate(item_list):
                modifiers = []
                is_seafood = cat_name in ("Pescados", "Mariscos")
                if is_seafood:
                    modifiers = [
                        {"name": "Acompañante", "type": "select", "options": ["Tostones", "Arroz blanco", "Papas fritas", "Ensalada"]},
                        {"name": "Salsa extra", "type": "toggle", "options": ["Mayonesa", "Ketchup", "Salsa de ajo"]},
                    ]
                MenuItem.objects.create(
                    category=cat,
                    name=name,
                    description=desc,
                    price_base=price,
                    sort_order=i,
                    is_platillo_dia=(name in ("Pescado Frito", "Langosta")),
                    modifiers_available=modifiers,
                )

        self.stdout.write("  ✅ Items del menú creados")
