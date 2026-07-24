import os
import sys
import django
import urllib.request
from django.core.files.base import ContentFile

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.pos.models import MenuItem

IMAGE_URLS = {
    'Entradas': [
        'https://images.unsplash.com/photo-1541529086526-db283c563270?q=80&w=600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?q=80&w=600&auto=format&fit=crop',
    ],
    'Pescados': [
        'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?q=80&w=600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?q=80&w=600&auto=format&fit=crop',
    ],
    'Mariscos': [
        'https://images.unsplash.com/photo-1615141982883-c7da0e698b0b?q=80&w=600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1565557612260-6429535048d0?q=80&w=600&auto=format&fit=crop',
    ],
    'Criolla': [
        'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?q=80&w=600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=600&auto=format&fit=crop',
    ],
    'Bebidas': [
        'https://images.unsplash.com/photo-1536935338788-846bb9981813?q=80&w=600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=600&auto=format&fit=crop',
    ],
    'Postres': [
        'https://images.unsplash.com/photo-1551024506-0bccd828d307?q=80&w=600&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1563805042-7684c8a9e9cb?q=80&w=600&auto=format&fit=crop',
    ]
}

def populate():
    import random
    items = MenuItem.objects.all()
    print(f"Encontrados {items.count()} platos.")
    req = urllib.request.Request(
        url='http://example.com',
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    )
    for item in items:
        if not item.image:
            cat_name = item.category.name if item.category else None
            urls = IMAGE_URLS.get(cat_name, IMAGE_URLS['Entradas'])
            url = random.choice(urls)
            print(f"Descargando imagen para {item.name}...")
            try:
                req.full_url = url
                with urllib.request.urlopen(req, timeout=10) as response:
                    content = response.read()
                    filename = f"{item.name.replace(' ', '_').replace('/', '_').lower()}.jpg"
                    item.image.save(filename, ContentFile(content), save=True)
                    print(f" OK: Imagen asignada a {item.name}")
            except Exception as e:
                print(f" ERROR: Falló descarga para {item.name}: {e}")
        else:
            print(f" SKIP: {item.name} ya tiene imagen.")

if __name__ == '__main__':
    populate()
