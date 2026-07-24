from pathlib import Path
from django.http import FileResponse, Http404


FRONTEND_DIST = Path(__file__).resolve().parent.parent / 'frontend_dist'


def spa_serve(request, path=''):
    file_path = FRONTEND_DIST / path
    if file_path.exists() and file_path.is_file():
        return FileResponse(open(file_path, 'rb'))
    index = FRONTEND_DIST / 'index.html'
    if index.exists():
        return FileResponse(open(index, 'rb'))
    raise Http404('Frontend no encontrado. Ejecute npm run build primero.')
