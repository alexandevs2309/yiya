import logging

logger = logging.getLogger(__name__)

W = 38


def _sep(char='-'):
    return char * W


def print_receipt(printer, data: dict):
    try:
        printer.charcode('CP437')
    except Exception:
        pass

    _header(printer, data)
    _info(printer, data)
    _items(printer, data)
    _totals(printer, data)
    _payment(printer, data)
    _footer(printer, data)
    printer.cut()
    logger.info('Ticket de recibo impreso correctamente')


def _header(printer, data):
    printer.set(align='center', double_height=True, bold=True)
    printer.text(f"{data.get('restaurant', 'Restaurant')}\n")
    printer.set(align='center', bold=False)
    printer.text(f"{data.get('direccion', '')}\n")
    printer.text(f"RNC: {data.get('rnc', '')}\n")
    printer.text(_sep('=') + '\n')


def _info(printer, data):
    printer.set(align='left')
    from datetime import datetime as dt
    raw = data.get('fecha', '')
    try:
        fecha = dt.fromisoformat(raw).strftime('%d/%m/%Y %I:%M %p')
    except Exception:
        fecha = raw[:19]
    printer.text(f"Fecha:  {fecha}\n")
    printer.text(f"Mesa:   {data.get('mesa', '--')}\n")
    printer.text(f"Mesero: {data.get('mesero', '--')}\n")

    metodo = data.get('metodo_pago', '')
    if metodo:
        printer.text(f"Pago:   {metodo}\n")

    ncf = data.get('ncf', '')
    if ncf:
        printer.set(bold=True)
        printer.text(f"NCF:    {ncf}\n")
        printer.set(bold=False)

    if data.get('rnc_cliente'):
        printer.text(f"RNC:    {data['rnc_cliente']}\n")
    if data.get('razon_social'):
        printer.text(f"Cliente: {data['razon_social']}\n")

    printer.text(_sep('-') + '\n')


def _items(printer, data):
    printer.set(bold=True)
    printer.text(f"{'Cant':>4} {'Descripci'+chr(162)+'n':<23} {'Total':>7}\n")
    printer.set(bold=False)

    for item in data.get('items', []):
        cant = item.get('cantidad', 1)
        nombre = _fix(str(item.get('nombre', '')))
        total = item.get('total', 0)
        printer.text(f"{cant:>4} {nombre[:24]:<24} ${total:>5.2f}\n")
        for mod in item.get('modificadores', []):
            printer.text(f"{'':>5}+ {_fix(str(mod)[:29])}\n")

    printer.text(_sep('-') + '\n')


def _totals(printer, data):
    subtotal = data.get('subtotal', 0)
    itbis = data.get('itbis', 0)
    propina = data.get('propina', 0)
    total = data.get('total', 0)

    printer.set(align='right')
    printer.text(f"Subtotal:      ${subtotal:>8.2f}\n")
    printer.text(f"ITBIS (18%):   ${itbis:>8.2f}\n")
    printer.text(f"Propina (10%): ${propina:>8.2f}\n")
    printer.set(align='right', double_height=True, bold=True)
    printer.text(f"TOTAL:         ${total:>8.2f}\n")
    printer.set(align='left', double_height=False, bold=False)


def _payment(printer, data):
    printer.text(_sep('-') + '\n')
    printer.text(f"Metodo: {data.get('metodo_pago', '')}\n")
    efectivo = data.get('efectivo')
    cambio = data.get('cambio')
    if efectivo is not None:
        printer.text(f"Efectivo: ${efectivo:.2f}\n")
        if cambio and cambio > 0:
            printer.text(f"Cambio:   ${cambio:.2f}\n")

    ncf = data.get('ncf', '')
    try:
        if ncf:
            printer.set(align='center')
            printer.qr(
                f"{data.get('restaurant', '')}|{data.get('rnc', '')}|{ncf}|{data.get('total', 0):.2f}",
                center=True,
            )
            printer.text('\n')
    except Exception:
        pass


def _footer(printer, data):
    printer.set(align='center', bold=True)
    printer.text('\nGracias por su visita!\n')
    printer.set(bold=False)
    printer.text('Samana, Republica Dominicana\n\n')


def _fix(s):
    replacements = {
        'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'Ñ': 'N', 'ñ': 'n', 'Ü': 'U', 'ü': 'u',
    }
    for a, b in replacements.items():
        s = s.replace(a, b)
    return s
