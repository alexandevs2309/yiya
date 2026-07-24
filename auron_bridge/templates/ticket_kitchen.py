"""
Template engine for ESC/POS kitchen order tickets.
Generates raw ESC/POS commands from structured data.
"""

import logging

logger = logging.getLogger(__name__)


def print_kitchen(printer, data: dict):
    printer.set(align='center', double_height=True, double_width=True)
    printer.text('=== COMANDA DE COCINA ===\n')

    printer.set(align='left', double_height=True)
    printer.text(f"MESA: {data.get('mesa', '—')}\n")

    printer.set(align='left')
    printer.text(f"Fecha: {_fmt_date(data.get('fecha', ''))}\n")
    printer.text(f"Mesero: {data.get('mesero', '—')}\n")
    printer.text('--------------------------------\n')

    printer.set(align='left', double_height=True)
    for item in data.get('items', []):
        printer.text(f"[ ] {item.get('cantidad', 1)}x {item.get('nombre', '')}\n")
        for mod in item.get('modificadores', []):
            printer.text(f'    * {mod}\n')

    printer.set(align='left')
    printer.text('--------------------------------\n')
    nota = data.get('nota', '')
    if nota:
        printer.set(double_height=True)
        printer.text(f"NOTAS: {nota}\n")

    printer.text('\n\n\n')
    printer.cut()
    logger.info('Comanda de cocina impresa correctamente')


def _fmt_date(iso_str: str) -> str:
    try:
        from datetime import datetime
        dt = datetime.fromisoformat(iso_str)
        return dt.strftime('%d/%m/%Y %H:%M')
    except (ValueError, TypeError):
        return iso_str[:19]
