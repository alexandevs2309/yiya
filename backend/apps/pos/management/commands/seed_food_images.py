import requests
from io import BytesIO
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from apps.pos.models import MenuItem


class Command(BaseCommand):
    help = 'Download random food images for menu items without images'

    def handle(self, *args, **options):
        items = MenuItem.objects.filter(image__isnull=True) | MenuItem.objects.filter(image__exact='')
        items = items.distinct()
        count = items.count()
        self.stdout.write(f"Found {count} items without images")

        if count == 0:
            return

        for item in items:
            try:
                resp = requests.get('https://foodish-api.com/api/', timeout=10)
                if resp.status_code != 200:
                    self.stdout.write(self.style.WARNING(f"  API error for {item.name}: {resp.status_code}"))
                    continue

                image_url = resp.json()['image']
                img_resp = requests.get(image_url, timeout=15)
                if img_resp.status_code != 200:
                    self.stdout.write(self.style.WARNING(f"  Download error for {item.name}: {img_resp.status_code}"))
                    continue

                filename = image_url.rstrip('/').split('/')[-1]
                if '.' not in filename:
                    filename += '.jpg'

                item.image.save(filename, ContentFile(img_resp.content), save=True)
                self.stdout.write(self.style.SUCCESS(f"  ✓ {item.name}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  ✗ {item.name}: {e}"))
