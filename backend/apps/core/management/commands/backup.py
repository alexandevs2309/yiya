import os
import json
import gzip
import shutil
from datetime import datetime
from pathlib import Path
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.conf import settings


class Command(BaseCommand):
    help = 'Respalda la base de datos y archivos multimedia'

    def add_arguments(self, parser):
        parser.add_argument('--output', '-o', default=None, help='Directorio de salida (default: backups/)')
        parser.add_argument('--s3', action='store_true', help='Subir a S3 si está configurado')

    def handle(self, *args, **options):
        backup_dir = Path(options['output'] or settings.BASE_DIR / 'backups')
        backup_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        db_file = backup_dir / f'dyiya_db_{timestamp}.json.gz'
        media_file = backup_dir / f'dyiya_media_{timestamp}.tar.gz'

        # Database dump
        self.stdout.write('Respaldando base de datos...')
        with gzip.open(db_file, 'wt', encoding='utf-8') as f:
            call_command('dumpdata', stdout=f, exclude=['contenttypes', 'auth.Permission', 'sessions'])
        self.stdout.write(self.style.SUCCESS(f'  ✓ {db_file}'))

        # Media backup
        media_root = settings.MEDIA_ROOT
        if media_root and Path(media_root).exists():
            self.stdout.write('Respaldando archivos multimedia...')
            shutil.make_archive(str(media_file.with_suffix('')), 'gztar', media_root)
            self.stdout.write(self.style.SUCCESS(f'  ✓ {media_file}'))

        # S3 upload
        if options['s3']:
            self._upload_s3(db_file, media_file)

        # Cleanup old backups (keep last 7)
        self._cleanup(backup_dir)

        self.stdout.write(self.style.SUCCESS(f'Backup completado en {backup_dir}'))

    def _upload_s3(self, db_file, media_file):
        bucket = os.getenv('AWS_BACKUP_BUCKET')
        if not bucket:
            self.stdout.write(self.style.WARNING('  AWS_BACKUP_BUCKET no configurado, saltando S3'))
            return
        try:
            import boto3
            s3 = boto3.client(
                's3',
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
                region_name=os.getenv('AWS_REGION', 'us-east-1'),
            )
            prefix = f'backups/{datetime.now().strftime("%Y/%m/%d")}'
            for f in [db_file, media_file]:
                if f.exists():
                    key = f'{prefix}/{f.name}'
                    s3.upload_file(str(f), bucket, key)
                    self.stdout.write(self.style.SUCCESS(f'  ✓ Subido a s3://{bucket}/{key}'))
        except ImportError:
            self.stdout.write(self.style.ERROR('  boto3 no instalado. pip install boto3'))

    def _cleanup(self, backup_dir):
        files = sorted(backup_dir.glob('dyiya_db_*.json.gz'), reverse=True)
        for f in files[7:]:
            f.unlink()
            self.stdout.write(f'  Limpiado: {f.name}')
