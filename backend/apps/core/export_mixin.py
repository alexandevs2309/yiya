import csv
from django.http import HttpResponse


class CSVExportMixin:
    """
    Mixin que agrega una acción `export_csv` a un ViewSet.
    Requiere que la subclase defina `csv_filename` y `csv_fields`.
    """
    csv_filename = 'export.csv'
    csv_fields: list[tuple[str, str]] = []

    def export_csv(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{self.csv_filename}"'

        writer = csv.writer(response)
        writer.writerow([label for _, label in self.csv_fields])

        for obj in queryset:
            row = []
            for field, _ in self.csv_fields:
                value = obj
                for part in field.split('__'):
                    value = getattr(value, part, '') if value else ''
                row.append(str(value) if value is not None else '')
            writer.writerow(row)

        return response
